const mongoose = require('mongoose');

const publicBookmarkSchema = new mongoose.Schema({
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true,
        unique: true,
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
        default: ()=>{
            return new Date().getTime();
        },
    },
},{ versionKey: false, id: false   });

const PublicBookmark = mongoose.model('PublicBookmarks', publicBookmarkSchema);


module.exports = { PublicBookmark }
