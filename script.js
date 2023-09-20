// Importing required libraries
const cron = require('node-cron');
const User = require('./Models/User');
const Block = require('./Models/Block');
const {
    contractAddress,
    abi,
    ownerAddress,
} = require('./utils/contractDetails.json');
const Web3 = require('web3');
const mongoose = require('mongoose');
require('dotenv').config();

const web3 = new Web3(
    'https://polygon-mumbai.infura.io/v3/6def1f4f94bc4794983747a50a72b5df'
);
const contract = new web3.eth.Contract(abi, contractAddress);

// MongoDB Connection
mongoose
    .connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then((result) => {
        console.log('Database connected!');
    })
    .catch((error) => {
        console.log('Database connection error := ', error);
    });

async function getLastProcessedBlock() {
    try {
        // Fetch the last processed block number from the database
        const lastBlock = await Block.findOne({}); // You might want to specify a specific block or handle multiple blocks differently

        if (lastBlock) {
            return lastBlock.lastProcessedBlock; // Default to .env if not found
        } else {
            return Number(process.env.BLOCK) || 0;
        }
    } catch (error) {
        console.error('Error fetching lastProcessedBlock:', error);
        return 0; // Default to 0 in case of an error
    }
}

async function updateUserWallet(amount, blockNumber) {
    try {
        // Find the user by sender address (assuming each user corresponds to a unique address)
        const user = await User.findOneAndUpdate({
            _id: '6509d0717943b1a0b52cee13',
        });
        // const lastBlock = await Block.findOne({});

        if (user) {
            // Update the user's wallet balance
            user.Wallet = +amount;

            // Update the lastProcessedBlock field
            // lastBlock.lastProcessedBlock = blockNumber;

            await user.save();
            // await lastBlock.save();

            console.log(`Updated wallet balance for ${user._id}`);
        }
    } catch (error) {
        console.error('Error updating user wallet:', error);
    }
}

// Creating a cron job which runs on every 10 second
cron.schedule('*/10 * * * * *', async function () {
    try {
        console.log('Monitering events...');
        const lastProcessedBlock = await getLastProcessedBlock(); // Fetch the last processed block from the database

        // Get the current block number
        const currentBlockNumber =  await web3.eth.getBlockNumber(); // 40280057

        let toBlock;
        if (lastProcessedBlock <= currentBlockNumber) {
            toBlock =
            (currentBlockNumber - lastProcessedBlock) > 100
            ? Number(lastProcessedBlock) + 100
            : currentBlockNumber;
        } else {
            return;
        }

        console.log("🚀 ~ file: script.js:83 ~ toBlock:", toBlock);

        const events = await contract.getPastEvents('Transfer', {
            fromBlock: lastProcessedBlock,
            toBlock: toBlock, // You can set this to a specific block number if needed
        });

        events.forEach(async (event) => {
            const { from, to, value } = event.returnValues;
            console.log(from, "   ", to, "      ", event.returnValues);

            // Handle each transfer event
            if (
                to.toLowerCase() == ownerAddress.toLowerCase() &&
                from != '0x0000000000000000000000000000000000000000'
            ) {
                console.log('event.returnValues ======>  ', event.returnValues);
                await updateUserWallet(value, toBlock + 1);
            }
        });

        // Updating Block
        await Block.findOneAndUpdate(
            {},
            { $set: { lastProcessedBlock: toBlock + 1 } },
            { upsert: true }
        );

    } catch (error) {
        console.log('Error := ', error);
    }
    // contract
    //     .getPastEvents('Transfer', {
    //         fromBlock: lastProcessedBlock,
    //         toBlock: toBlock, // You can set this to a specific block number if needed
    //     })
    //     .then((events) => {
    //         events.forEach((event) => {
    //             const { from, to, value, blockNumber } = event.returnValues;

    //             // Handle each transfer event
    //             if(to == ownerAddress.toLowerCase() && from != "0x0000000000000000000000000000000000000000") {
    //                 console.log("events fetched at Block := ", blockNumber);
    //                 console.log("event.returnValues ======>  ", event.returnValues);
    //                 updateUserWallet(value, toBlock + 1);
    //             }
    //         });
    //     })
    //     .catch((error) => {
    //         console.error('Error:', error);
    //     });
});
