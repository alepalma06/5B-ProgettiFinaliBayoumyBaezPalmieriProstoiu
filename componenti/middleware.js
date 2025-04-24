export function socketMiddleware(socket) {
    // Funzione per inviare messaggi al server
    function sendMessage(type, data) {
        socket.send(JSON.stringify({ type, ...data }));
    }

    // Funzione per ricevere messaggi dal server e gestire la risposta
    function onReceiveMessage(callback) {
        socket.onmessage = (event) => {
            const response = JSON.parse(event.data);
            callback(response);  // Passa la risposta alla funzione di callback
        };
    }

    // Funzione per creare una stanza
    function createRoom(roomId) {
        sendMessage('create-room', { roomId });
    }

    // Funzione per unirsi a una stanza
    function joinRoom(roomId, playerName) {
        sendMessage('join-room', { roomId, playerName });
    }

    // Funzione per distribuire le carte
    function distributeCards(roomId,codice) {
        sendMessage('distribute-cards', { roomId,codice });
    }

    function infoRoom(roomId) {
        sendMessage('info-room', { roomId });
    }

    function startGame(roomId) {
        sendMessage('start-game', { roomId });
    }

    function confirmDraw(roomId, playerName) {
        sendMessage('confirm-draw', { roomId , playerName});
    }

    function turnoClient(roomId, playerName ,scelta,first) {
        sendMessage('turno-client', { roomId , playerName ,scelta,first});
    }

    // Esponi queste funzioni per l'uso esterno
    return {
        createRoom,
        joinRoom,
        distributeCards,
        onReceiveMessage,
        infoRoom,
        startGame,
        confirmDraw,
        turnoClient
    };
}
