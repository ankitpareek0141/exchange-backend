const jwt = require('jsonwebtoken');
const { body } = require('express-validator');

const middlewares = {};

middlewares.validateSignupData = [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 6 characters long'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
        .withMessage('Passwords must match'),
    body('country').notEmpty().withMessage('Country is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
];

middlewares.validateLoginData = [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required'),
];

middlewares.validateEmail = [
    body('email').isEmail().withMessage('Invalid email format'),
];

middlewares.validateResetPasswordData = [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords must match');
    }
    return true;
  }),
]

// Middleware function to verify JWT tokens
middlewares.verifyToken = (req, res, next) => {
    // Get the token from the request headers, query parameters, or cookies (whichever you prefer)
    const token = req.headers.authorization || req.query.token || req.cookies.token;

    // Check if the token exists
    if (!token) {
      return res.status(401).json({ message: 'Token not provided' });
    }
  
    // Verify the token
    jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token authentication failed or has expired!' });
      }
  
      // If the token is valid, attach the decoded payload to the request object for later use
      req.user = decoded;
  
      // Continue to the next middleware or route handler
      next();
    });
  };

module.exports = middlewares;
