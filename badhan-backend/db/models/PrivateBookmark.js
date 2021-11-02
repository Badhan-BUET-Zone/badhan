const mongoose = require('mongoose');

const privateBookmarkSchema = new mongoose.Schema({
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true,
    },
    markerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true,
    },
    time: {
        type: Number,
        min: 0,
        required: true,
        validate: [{
            validator: (value) => {
                return Number.isInteger(value);
            }, msg: 'DB: time must be an integer'
        }],
    },
},{ versionKey: false, id: false   });

privateBookmarkSchema.index( { donorId: 1, markerId: 1}, { unique: true } );

const PrivateBookmark = mongoose.model('PrivateBookmarks', privateBookmarkSchema);

module.exports = { PrivateBookmark }
