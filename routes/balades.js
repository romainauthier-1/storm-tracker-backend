const express = require('express');
const router = express.Router();
const Balade = require('../models/balades');

// GET /balades - Récupérer toutes les balades
router.get('/', (req, res) => {
  Balade.find()
  .populate({
    path: 'rencontres', 
    select:'nom proprietaire storm_like -_id',
})
  .then(data => {
    res.json({ balades: data })
})
  .catch(err => {
    res.json({ result: false, err})
  });
});

// POST /balades - Ajouter une balade
router.post('/', (req, res) => {
  const newBalade = new Balade({
    date: new Date(),
    duree: req.body.duree,
    lieu: req.body.lieu,
    rencontres: req.body.rencontres,
    pipi: req.body.pipi,
    caca: req.body.caca,
    nourriture: req.body.nourriture,
    comment: req.body.comment,
  });

  newBalade.save()
    .then(data => {
      res.json({ result: true, Balade: data });
    })
    .catch(error => {
      res.json({ result: false, error });
    });
});

module.exports = router;