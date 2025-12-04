// ==========================================
// openaiService.js
// Servizio di simulazione partita (può usare OpenAI o fallback locale)
// Esporta solo funzioni pure, NESSUNA route Express qui.
// ==========================================

const { openai: openaiCfg, match: matchCfg } = require('./config');
const { promptConfig, buildUserPrompt } = require('./promptConfig');

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function simulateMatchLocal(squadra1, squadra2, tattica1 = 'equilibrata', tattica2 = 'equilibrata') {
    // Seme semplice basato su input per avere un po' di stabilità
    const maxAzioni = randomInt(6, 14);
    let gol1 = 0;
    let gol2 = 0;
    const eventi = [];

    const tipi = ['Tiro', 'Occasione', 'Ammonizione', 'Punizione', 'Corner'];
	// Normalizza le tattiche per gestire null/undefined e uniformare i confronti
	const t1 = typeof tattica1 === 'string' ? tattica1.toLowerCase() : 'equilibrata';
	const t2 = typeof tattica2 === 'string' ? tattica2.toLowerCase() : 'equilibrata';
	const attacchi1Bias = t1.includes('attacco') ? 1.2 : t1.includes('difesa') ? 0.8 : 1.0;
	const attacchi2Bias = t2.includes('attacco') ? 1.2 : t2.includes('difesa') ? 0.8 : 1.0;

    for (let i = 0; i < maxAzioni; i++) {
        const minuto = Math.min(90, randomInt(2, 88));
        const attacca1 = Math.random() * attacchi1Bias > Math.random() * attacchi2Bias;
        const isGoal = Math.random() < 0.18; // 18% che l'azione sia un gol

        if (isGoal) {
            if (attacca1) {
                gol1++;
                eventi.push({
                    minuto,
                    tipo: 'Goal',
                    descrizione: `${squadra1.nome} in vantaggio! Azione corale conclusa con un tap-in.`
                });
            } else {
                gol2++;
                eventi.push({
                    minuto,
                    tipo: 'Goal',
                    descrizione: `${squadra2.nome} trova la rete con un diagonale preciso.`
                });
            }
        } else {
            const tipo = pick(tipi);
            const chi = attacca1 ? squadra1.nome : squadra2.nome;
            eventi.push({
                minuto,
                tipo,
                descrizione: `${chi} costruisce: ${tipo.toLowerCase()} pericoloso ma nulla di fatto.`
            });
        }
    }

    // Ordina per minuto
    eventi.sort((a, b) => a.minuto - b.minuto);

    const marcatori = `${squadra1.nome} ${gol1} - ${gol2} ${squadra2.nome}`;

    return {
        gol_squadra_1: gol1,
        gol_squadra_2: gol2,
        marcatori,
        azioni: eventi
    };
}

async function callOpenAIForMatch(squadra1, squadra2, tattica1 = 'equilibrata', tattica2 = 'equilibrata') {
	if (!openaiCfg || !openaiCfg.apiKey) {
		throw new Error('OpenAI non configurato: manca OPENAI_API_KEY');
	}

	const listaRosa = (rosa) => rosa
		.map(g => `${g.nome_completo || g.nome || 'Giocatore'} (${g.ruolo || 'N/D'})`)
		.join(', ');

	const rosaStruct1 = (squadra1.rosa || []).map(g => ({ nome: g.nome_completo || g.nome || 'N/D', ruolo: g.ruolo || 'N/D' }));
	const rosaStruct2 = (squadra2.rosa || []).map(g => ({ nome: g.nome_completo || g.nome || 'N/D', ruolo: g.ruolo || 'N/D' }));

	const variables = {
		SQUADRA1_NOME: squadra1.nome,
		SQUADRA2_NOME: squadra2.nome,
		TATTICA1: tattica1 || 'equilibrata',
		TATTICA2: tattica2 || 'equilibrata',
		ROSA1: listaRosa(squadra1.rosa || []),
		ROSA2: listaRosa(squadra2.rosa || []),
		MIN_AZIONI: matchCfg?.minAzioni ?? 10,
		MAX_AZIONI: matchCfg?.maxAzioni ?? 15
	};

	const system = promptConfig.systemPrompt;
	const user = buildUserPrompt(variables);

	const messages = [
		{ role: 'system', content: system },
		{ role: 'user', content: user },
		{ role: 'user', content: JSON.stringify({
			meta: {
				istruzione: 'Usa esattamente questi nomi di squadre e giocatori nelle descrizioni',
				min_azioni: variables.MIN_AZIONI,
				max_azioni: variables.MAX_AZIONI
			},
			squadre: [
				{ nome: squadra1.nome, tattica: variables.TATTICA1, rosa: rosaStruct1 },
				{ nome: squadra2.nome, tattica: variables.TATTICA2, rosa: rosaStruct2 }
			]
		}) }
	];

	// Debug: stampa prompt completo (senza API key)
	try {
		console.log('🧠 OpenAI Match Prompt — system:\n' + system);
		console.log('🧠 OpenAI Match Prompt — user:\n' + user);
		console.log('🧠 OpenAI Match Data:\n' + JSON.stringify({
			squadra1: { nome: squadra1.nome, tattica: variables.TATTICA1, rosa: rosaStruct1 },
			squadra2: { nome: squadra2.nome, tattica: variables.TATTICA2, rosa: rosaStruct2 }
		}, null, 2));
	} catch(_) {}

	const body = {
		model: openaiCfg.model,
		messages,
		temperature: openaiCfg.temperature,
		max_tokens: openaiCfg.maxTokens,
		response_format: { type: 'json_object' }
	};

	const resp = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${openaiCfg.apiKey}`
		},
		body: JSON.stringify(body)
	});

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`OpenAI HTTP ${resp.status}: ${text}`);
	}

	const data = await resp.json();
	const content = data.choices?.[0]?.message?.content;
	if (!content) throw new Error('OpenAI: risposta vuota');

	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch (e) {
		throw new Error('OpenAI: JSON non valido');
	}

	// Validazione minima del formato
	if (!Array.isArray(parsed.azioni)) throw new Error('OpenAI: campo "azioni" mancante');
	if (typeof parsed.gol_squadra_1 !== 'number' || typeof parsed.gol_squadra_2 !== 'number') {
		throw new Error('OpenAI: campi gol non numerici');
	}

	// Sanitize: sostituisci eventuali placeholder team e rimuovi blocchi {{...}}
	const replaceTeamPlaceholders = (text) => {
		if (typeof text !== 'string') return text;
		return text
			.replace(/\{\{\s*SQUADRA1_NOME\s*\}\}/g, squadra1.nome)
			.replace(/\{\{\s*SQUADRA2_NOME\s*\}\}/g, squadra2.nome)
			.replace(/\{\{[^}]*\}\}/g, ''); // rimuove qualsiasi altro placeholder rimasto
	};

	if (typeof parsed.marcatori === 'string') {
		parsed.marcatori = replaceTeamPlaceholders(parsed.marcatori);
	}

	parsed.azioni = parsed.azioni.map(a => ({
		...a,
		tipo: replaceTeamPlaceholders(a.tipo),
		descrizione: replaceTeamPlaceholders(a.descrizione)
	}));

	// Ordina azioni per minuto per sicurezza
	parsed.azioni.sort((a, b) => (a.minuto || 0) - (b.minuto || 0));

	return parsed;
}

async function simulateMatch(squadra1, squadra2, tattica1 = 'equilibrata', tattica2 = 'equilibrata') {
	try {
		return await callOpenAIForMatch(squadra1, squadra2, tattica1, tattica2);
	} catch (err) {
		console.warn('⚠️  OpenAI non disponibile o errore, uso fallback locale:', err.message);
		return await simulateMatchLocal(squadra1, squadra2, tattica1, tattica2);
	}
}

module.exports = { simulateMatch };
