const mongoose = require('mongoose');

const baladeSchema = mongoose.Schema ({
    date: Date,
    duree: Number,
    lieu: String,
    rencontres: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chien',
        }],
    pipi: Boolean,
    caca : {
        fait_caca: Boolean,
        note_caca: Number,
        comment_caca: String,
    },
    nourriture: {
        a_mangé: Boolean,
        comment_nourriture: String,
    },
    comment: String,
});

const Balade = mongoose.model('Balade', baladeSchema);

module.exports = Balade;
