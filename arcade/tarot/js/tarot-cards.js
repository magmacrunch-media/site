function createTarotCardElement(card,faceUp){const savedFaceUp=card.faceUp;card.faceUp=faceUp;const el=TarotCardFactory.createCard(card);card.faceUp=savedFaceUp;return el}
