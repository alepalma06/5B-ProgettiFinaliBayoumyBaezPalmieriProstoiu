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

    // Esponi queste funzioni per l'uso esterno
    return {
        createRoom,
        joinRoom,
        onReceiveMessage,
    };
}
