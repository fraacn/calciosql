// ============================================
// promptConfig.js
// Testi in linguaggio naturale per la simulazione match
// Modifica liberamente questi template. Usa i placeholder {{...}}.
// ============================================

const promptConfig = {
	// Prompt di sistema: stile, ruolo, formato richiesto
	systemPrompt: (
		"Sei un motore di simulazione calcistica. " +
		"Genera una cronologia realistica di una partita di calcio tra due squadre. " +
		"Rispetta le tattiche fornite e mantieni un tono sportivo, conciso e credibile. " +
		"Produci esclusivamente JSON valido senza testo extra."
	),

	// Scenari aggiuntivi opzionali da inserire casualmente nel prompt utente
	scenarios: [
		"La partita è molto equilibrata e c'è grande possibilità di un pareggio",
		"La partita è dominata dalla squadra di casa che farà la maggior parte di azioni da gol e probabilmente vincerà con 2 gol di scarto almeno",
		"La partita è dominata dalla squadra ospite che farà la maggior parte di azioni da gol e probabilmente vincerà con 2 gol di scarto almeno",
		"La partita è abbastanza equilibrata, ma si fanno tanti gol",
		"La partita è abbastanza statica e non si fanno tanti gol. Potrebbe finire 0-0",
		"Partita decisa da episodi: equilibrio generale ma risultato influenzato da un rigore, espulsione o errore difensivo.",
		"Partita di contenimento: una squadra si chiude e riparte in contropiede, cercando di colpire con azioni rapide.",
		"Partita travolgente: una squadra segna presto e continua a spingere, chiudendo con goleada.",
		"Partita di resistenza: una squadra in vantaggio difende con ordine sotto pressione continua.",
		"Partita con ribaltamento finale: risultato deciso negli ultimi minuti. Ma alla fine vince la squadra che ha segnato per prima",
        "Partita con tanti gol e tanti assist: risultato ribaltato più volte. Sarà vincitrice la squadra che prima era in svantaggio",
        "Partita con goleada di una delle due squadre, quella con i giocatori più forti e la rosa migliore"
	],

	// Prompt utente: contiene istruzioni e dati. I placeholder vengono sostituiti a runtime
	userPrompt: (
		"Simula una partita di calcio tra le due squadre.\n" +
		"Usa ESATTAMENTE i nomi così come compaiono nelle rose fornite.\n" +
		"Vincoli output (obbligatorio, solo JSON):\n" +
		"{\n" +
		"  \"gol_squadra_1\": number,\n" +
		"  \"gol_squadra_2\": number,\n" +
		"  \"marcatori\": string, // formato: '<NOME_SQUADRA1> X - Y <NOME_SQUADRA2>'\n" +
		"  \"azioni\": [ // ordinate per minuto crescente\n" +
		"    { \"minuto\": number (2-90), \"tipo\": string, \"descrizione\": string }\n" +
		"  ]\n" +
		"}\n\n" +
		"Linee guida: genera tra {{MIN_AZIONI}} e {{MAX_AZIONI}} azioni totali; " +
		"varia gli eventi tra 'Goal', 'Tiro', 'Occasione', 'Ammonizione', 'Punizione', 'Corner'; " +
		"rispetta il bias tattico (più azioni offensive per chi è all'attacco) ma stanchezza maggiore nelle fasi successive della partita e possibilità di essere contrattaccati e di subire gol; " +
        "Le tattiche più raffinate meritano più probabilità di andare in gol; " +
        "usa nomi realistici dalla rosa per i riferimenti impliciti nella descrizione; " +
		"non creare espulsioni; mantieni verosimiglianza; " +
		"vietato usare placeholder o stringhe tra doppie parentesi graffe (es. {{...}}) nell'output."
	)
};

// Utilità semplice per sostituire i placeholder {{KEY}} nel template
function fillTemplate(template, variables) {
	return Object.keys(variables).reduce((acc, key) => {
		const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
		return acc.replace(pattern, variables[key]);
	}, template);
}

// Costruisce il prompt utente inserendo casualmente uno scenario aggiuntivo
function buildUserPrompt(variables) {
	const base = fillTemplate(promptConfig.userPrompt, variables);
	const scenarios = Array.isArray(promptConfig.scenarios) ? promptConfig.scenarios : [];
	if (!scenarios.length) return base;
	const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
	// Inserisce lo scenario come riga aggiuntiva.
	// 1) Prova prima a metterlo subito prima di "Vincoli output"
	let withScenario = base.replace(
		/(^|\n)Vincoli output/,
		`\nScenario partita (casuale): ${randomScenario}.\n\nVincoli output`
	);
	// 2) Se nessuna sostituzione è avvenuta, prova prima di "Linee guida:"
	if (withScenario === base) {
		withScenario = base.replace(
			/\n\nLinee guida:/,
			`\nScenario partita (casuale): ${randomScenario}.\n\nLinee guida:`
		);
	}
	// 3) Se ancora uguale, appendi in fondo
	if (withScenario === base) {
		withScenario = `${base}\nScenario partita (casuale): ${randomScenario}.`;
	}
	return withScenario;
}

module.exports = { promptConfig, fillTemplate, buildUserPrompt };
