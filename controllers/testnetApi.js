// This module help to listen request
const Web3 = require('web3');
const web3 = new Web3();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const User = require('../Models/User');
const wallet = require('./walletDetail.json');
const ABI = require('./abi/abi.json');

web3.setProvider(
    new web3.providers.HttpProvider(
        //"https://rpc-mumbai.maticvigil.com/"
        'https://rpc-mumbai.maticvigil.com/'
    )
);
const contractAddres = wallet.contractAddress;
const fromAddress = wallet.address;
const privateKey = wallet.privateKey;
const ContractObj = new web3.eth.Contract(ABI, contractAddres);

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('hashed Password := ', hashedPassword);

    return hashedPassword;
}

exports.exicuteTransaction = async (request, response) => {
    try {
        let amount = request.body.amount;
        let pair = request.body.pair;
        let balance = await web3.eth.getBalance(fromAddress);

        amount = (amount * 10 ** 18).toLocaleString('fullwide', {
            useGrouping: false,
        });
        if (balance > amount) {
            let getAmountsOut = await ContractObj.methods
                .getAmountsOut(amount.toString(), pair)
                .call();

            let tx_builder = await ContractObj.methods.swapETHForExactTokens(
                getAmountsOut[1],
                pair,
                fromAddress,
                '16000000000000'
            );
            let encoded_tx = tx_builder.encodeABI();

            let gasPrice = await web3.eth.getGasPrice();
            let gasLimit = await web3.eth.estimateGas({
                gasPrice: web3.utils.toHex(gasPrice),
                to: contractAddres,
                from: fromAddress,
                data: encoded_tx,
                value: amount,
            });

            const transactionObject = {
                gasPrice: web3.utils.toHex(gasPrice),
                gas: web3.utils.toHex(gasLimit),
                to: contractAddres,
                from: fromAddress,
                data: encoded_tx,
                value: amount,
            };

            await web3.eth.accounts
                .signTransaction(transactionObject, privateKey)
                .then(async (signedTx) => {
                    await web3.eth.sendSignedTransaction(
                        signedTx.rawTransaction,
                        async function (err, hash) {
                            if (!err) {
                                console.log(hash);

                                return response.status(200).json({
                                    status: true,
                                    message: 'Trasaction succesful',
                                    data: hash,
                                });
                            } else {
                                console.log(err);

                                return response.status(400).json({
                                    status: false,
                                    message: err.toString(),
                                });
                            }
                        }
                    );
                })
                .catch((err) => {
                    console.log(err);
                    return response.status(400).json({
                        status: false,
                        message: e.toString(),
                    });
                });
        } else {
            return response.status(200).json({
                status: true,
                message: 'Insufficient balance',
            });
        }
    } catch (e) {
        return response.status(400).json({
            status: false,
            message: e.toString(),
        });
    }
};

// User signup API
exports.signup = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            firstName,
            lastName,
            username,
            email,
            password,
            country,
            phoneNumber,
        } = req.body;

        const hashedPassword = await hashPassword(password);

        // Create a new user document
        const newUser = new User({
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword,
            country,
            phoneNumber,
        });

        // Save the user to the database
        await newUser.save();

        return res
            .status(201)
            .json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error.message);

        if (error.code == 11000) {
            console.log('Name := ', Object.keys(error?.keyValue)[0]);

            const duplicateFieldName = Object.keys(error?.keyValue)[0];

            return res.status(400).json({
                message:
                    'User already registered with this ' + duplicateFieldName,
            });
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// User login API
exports.login = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if the provided password matches the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a JWT token with the user's ID as the payload
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            {
                expiresIn: '3h', // Token expires in 1 hour (adjust as needed)
            }
        );

        // Saving token in the user document
        user.token = token;
        await user.save();

        return res
            .status(200)
            .json({ message: 'User login successful!', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Controller for handling user forgot password request
exports.forgotPassword = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email } = req.body;

        // Generate a unique reset token and set an expiration time (e.g., 1 hour)
        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        // Update the user's document with the reset token and expiration time
        const user = await User.findOneAndUpdate(
            { email },
            {
                resetPasswordToken: resetToken,
                resetPasswordExpiresAt: Date.now() + 3600000, // Token expires in 1 hour (adjust as needed)
            }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Send an email with a password reset link
        const transporter = nodemailer.createTransport({
            // Configure your email service here (e.g., Gmail)
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASS,
            },
        });

        const resetLink = `${req.protocol}://${req.get(
            'host'
        )}/api/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: email,
            subject: 'Password Reset Request',
            text: `You are receiving this email because you (or someone else) have requested a password reset for your account.\n\n
      Please click on the following link to reset your password:\n\n${resetLink}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Controller for handling user reset password
exports.resetPassword = async (req, res) => {
    const { token } = req.query;
    const { newPassword } = req.body;

    try {
        // Verify the reset token and find the user
        const { email } = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the token is expired
        if (Date.now() > user.resetPasswordExpiresAt) {
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        // Hash the new password and update the user's password field
        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;

        // Clear the reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;

        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid or expired token' });
    }
};

// Controller for depositing amount to the user wallet
exports.deposit = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!req.body.amount || req.body.amount == 0) {
            return res.status(400).json({ message: 'Invalid deposit amount!' });
        }

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: req.user.userId,
            },
            {
                $inc: {
                    wallet: amount,
                },
            },
            {
                new: true,
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: 'User not found!',
            });
        }

        return res.status(200).json({
            message: 'Amount deposited successfully!',
            balance: updatedUser.wallet
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid or expired token' });
    }
};

// Controller for withdrawing amount from the user wallet
exports.withdraw = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!req.body.amount || req.body.amount == 0) {
            return res
                .status(400)
                .json({ message: 'Invalid withdrawal amount!' });
        }

        const userDocument = await User.findOne({
            _id: req.user.userId,
        });

        console.log(Number(userDocument.wallet));

        if (Number(userDocument.wallet) < amount) {
            return res.status(400).json({
                message: 'Insufficient balance in your wallet!',
            });
        }

        userDocument.wallet -= amount;

        const newDocument = await userDocument.save();

        return res.status(200).json({
            message: 'Amount withdrawn successfully!',
            balance: newDocument.wallet
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid or expired token' });
    }
};
