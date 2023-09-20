const jwt = require('jsonwebtoken');
var express = require('express');
var router = express.Router();
var bodyParser = require("body-parser");
var request = require("request");

// ---------------Controllers--------
const testnetApi =  require("../controllers/testnetApi");
const middlewares = require("../middlewares/middlewares");

// ==================================

// test.mint();

router.use(bodyParser.json());
router.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

// =======Wallet Create Testnet============================================
// router.post('/testnet/exicuteTransaction',testnetApi.exicuteTransaction.bind(this));
// router.post('/testnet/fetchTree',testnetApi.fetchTree.bind(this));


// ============== AUTHENTICATION API ===============
router.post("/signup", middlewares.validateSignupData , testnetApi.signup);
router.post("/login", middlewares.validateLoginData , testnetApi.login);
router.post("/forgot-password", middlewares.validateEmail, testnetApi.forgotPassword);
router.post("/reset-password", middlewares.validateResetPasswordData, testnetApi.resetPassword);

// =============== User API ==================
router.put("/deposit", middlewares.verifyToken, testnetApi.deposit);
router.put("/withdraw", middlewares.verifyToken, testnetApi.withdraw);


router.get("/", function (request, response) {
    response.contentType("routerlication/json");
    response.end(JSON.stringify("Node is running"));
});

router.get("*", function (req, res) {
    return res.status(200).json({
        code: 404,
        data: null,
        msg: "Invalid Request {URL Not Found}",
    });
});

router.post("*", function (req, res) {
    return res.status(200).json({
        code: 404,
        data: null,
        msg: "Invalid Request {URL Not Found}",
    });
});



function ensureWebToken(req, res, next) {

    const x_access_token = req.headers['authorization'];
    if (typeof x_access_token !== undefined) {
        req.token = x_access_token;
        verifyJWT(req, res, next);
    } else {
        res.sendStatus(403);
    }
}

async function verifyJWT(req, res, next) {

    jwt.verify(req.token, config.JWT_SECRET_KEY, async function (err, data) {
        if (err) {
            res.sendStatus(403);
        } else {
            const _data = await jwt.decode(req.token, {
                complete: true,
                json: true
            });
            req.user = _data['payload'];
            next();
        }
    })
}

module.exports.routes = router;
