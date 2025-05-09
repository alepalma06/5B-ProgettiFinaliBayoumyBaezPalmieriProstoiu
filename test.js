const PokerEvaluator = require('poker-evaluator');

// Le mani devono essere di 7 carte nel formato Texas Hold'em (2 carte giocatore + 5 comunità)
const hand1 = ['4h', '2c', '3d', '5h', 'qd', '6s', 'kd']; // Giocatore 1
const hand2 = ['4s', '7s', '3s', '5s', 'qd', '6s', 'kd']; // Giocatore 2

const result1 = PokerEvaluator.evalHand(hand1);
const result2 = PokerEvaluator.evalHand(hand2);

console.log("Giocatore 1:", result1.handName, "- Punteggio:", result1.value);
console.log("Giocatore 2:", result2.handName, "- Punteggio:", result2.value);

if (result1.value > result2.value) {
  console.log("Vince Giocatore 1");
} else if (result1.value < result2.value) {
  console.log("Vince Giocatore 2");
} else {
  console.log("Pareggio");
}
