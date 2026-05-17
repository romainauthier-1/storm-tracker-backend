const mongoose = require('mongoose');

const chienSchema = mongoose.Schema ({
    nom: String,
    proprietaire: String,
    first_rencontre: Date,
    nb_rencontres: Number,
    storm_like: Number,
    comment: String,
});

const Chien = mongoose.model('Chien', chienSchema);

module.exports = Chien;
