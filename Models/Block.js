const mongoose = require("mongoose");

const BlockSchema = new mongoose.Schema({
    lastProcessedBlock: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Block', BlockSchema);
