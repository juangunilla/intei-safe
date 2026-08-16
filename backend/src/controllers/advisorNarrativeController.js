const createAdvisorNarrativeController = ({ service }) => ({
  capabilities: (_req, res) => res.json(service.capabilities()),
  generate: async (req, res) => {
    try {
      return res.json(await service.generate(req.body));
    } catch (error) {
      return res.status(400).json({ message: 'La solicitud de redacción no es válida.', code: 'ADVISOR_NARRATIVE_INVALID_INPUT' });
    }
  },
});

module.exports = createAdvisorNarrativeController;
