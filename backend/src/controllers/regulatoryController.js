const { analyzeRegulatory } = require('../regulatory/regulatoryEngine');

const analyze = (req, res) => res.json(analyzeRegulatory({ profile: req.body.profile, document: req.body.document }));

module.exports = { analyze };
