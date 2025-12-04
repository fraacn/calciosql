// ============================================
// config.js
// Configurazione API OpenAI per match simulation
// ============================================

module.exports = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
        temperature: 0.9, // Creatività per le partite
        maxTokens: 2000
    },

    match: {
        minAzioni: 10,
        maxAzioni: 15,
        animationDelay: 6000 // millisecondi tra un'azione e l'altra
    }
};
