const express = require('express');
const router = express.Router();
const Chien = require('../models/chiens');

// GET /chiens - Récupérer tous les chiens
router.get('/', (req, res) => {
  Chien.find()
  .then(data => {
    res.json({ chiens: data })
})
  .catch(err => {
    res.json({ result: false, err})
  });
});

// POST /chiens - Ajouter un nouveau chien
router.post('/', (req, res) => {
  const newChien = new Chien({
    nom: req.body.nom,               // Récupère le nom envoyé
    proprietaire: req.body.proprietaire,  // Récupère le proprio envoyé
    first_rencontre: req.body.first_rencontre || new Date(), // Ou date actuelle
    nb_rencontres: 1,                // Première rencontre
    storm_like: req.body.storm_like || 0,
    comment: req.body.comment || ''
  });

  newChien.save()
    .then(data => {
      res.json({ result: true, chien: data });
    })
    .catch(error => {
      res.json({ result: false, error });
    });
});

module.exports = router;