document.addEventListener("DOMContentLoaded",async()=>{const game=new TarotGame;const startScreen=document.getElementById("startScreen");const gameScreen=document.getElementById("gameScreen");const startBtn=document.getElementById("startGameBtn");const rulesBtn=document.getElementById("viewRulesBtn");const newGameBtn=document.getElementById("newGameBtn");const menuBtn=document.getElementById("menuBtn");const bidBtn=document.getElementById("bidBtn");const playerHandEl=document.getElementById("playerHand");const northHandEl=document.getElementById("northHand");const eastHandEl=document.getElementById("eastHand");const westHandEl=document.getElementById("westHand");const trickAreaEl=document.getElementById("trickArea");const trickSlots={north:document.getElementById("trickNorth"),south:document.getElementById("trickSouth"),east:document.getElementById("trickEast"),west:document.getElementById("trickWest")};const dogAreaEl=document.getElementById("dogArea");const scoreDisplayEl=document.getElementById("scoreDisplay");const messageAreaEl=document.getElementById("messageArea");const actionButtonsEl=document.getElementById("actionButtons");startBtn.addEventListener("click",startGame);rulesBtn.addEventListener("click",showRules);newGameBtn.addEventListener("click",startGame);menuBtn.addEventListener("click",showMenu);bidBtn.addEventListener("click",()=>{if(game.phase===PHASE.BIDDING&&game.currentBidder===0){showBiddingModal()}});let generation=0;function later(fn,ms){const mine=generation;return setTimeout(()=>{if(mine===generation)fn()},ms)}function abandonGame(){generation++;document.querySelectorAll(".modal-overlay").forEach(m=>m.remove());clearActionButtons();dogAreaEl.innerHTML=""}document.addEventListener("keydown",e=>{if(e.key==="Escape"){const modal=document.querySelector(".modal-overlay.dismissable");if(modal)modal.remove()}if(e.key==="Enter"){if(game.phase===PHASE.BIDDING&&game.currentBidder===0){const existingModal=document.querySelector(".modal-overlay");if(!existingModal){showBiddingModal()}}}});function startGame(){abandonGame();startScreen.style.display="none";gameScreen.style.display="flex";game.reset();game.newRound();dealNewHand()}function dealNewHand(){const result=game.deal();poigneesShown=false;clearTrickArea();renderAllHands();updateScores();if(result.petitSec>=0){const who=result.petitSec===0?"You have":`${PLAYER_NAMES[POSITIONS[result.petitSec]]} has`;showMessage(`${who} the Petit sec. Redeal!`);later(()=>{game.newRound();dealNewHand()},2e3);return}showMessage(`Bidding round: Player ${result.firstBidder+1} starts`);startBidding(result.firstBidder)}function startBidding(firstBidder){game.currentBidder=firstBidder;if(firstBidder===0){bidBtn.style.display="";bidBtn.classList.add("bid-active");showMessage("Your turn to bid. Click Bid or press Enter")}else{bidBtn.style.display="none";bidBtn.classList.remove("bid-active");aiBid()}}function aiBid(){const state=game.getState();const playerIdx=state.currentBidder;const hand=state.hands[playerIdx];later(()=>{const bid=TarotAI.decideBid(hand,state.highestBid,state.takerIndex===playerIdx);afterBid(game.placeBid(playerIdx,bid))},500)}function afterBid(result){if(result===false){if(game.phase!==PHASE.BIDDING)return;const nextBidder2=game.currentBidder;if(nextBidder2===0){bidBtn.style.display="";showBiddingModal()}else{aiBid()}return}if(result&&result.event==="redeal"){bidBtn.style.display="none";bidBtn.classList.remove("bid-active");showMessage("No one bid. Redeal!");later(()=>{game.newRound();dealNewHand()},1500);return}if(result&&result.event==="trick_start"){bidBtn.style.display="none";bidBtn.classList.remove("bid-active");showMessage(`Player ${result.taker+1} takes with ${result.bid.name}!`);updateScores();later(()=>startTrickPlay(),1e3);return}if(result&&result.event==="dog_reveal"){bidBtn.style.display="none";bidBtn.classList.remove("bid-active");showMessage(`Player ${result.taker+1} takes with ${result.bid.name}!`);updateScores();later(()=>showDogExchange(result.taker),1e3);return}const nextBidder=game.currentBidder;if(nextBidder===0){bidBtn.style.display="";bidBtn.classList.add("bid-active");showMessage("Your turn to bid. Click Bid or press Enter")}else{bidBtn.style.display="none";bidBtn.classList.remove("bid-active");aiBid()}}function showBiddingModal(){if(document.querySelector(".modal-overlay .bid-options"))return;bidBtn.classList.remove("bid-active");const state=game.getState();const currentBid=state.highestBid;const currentBidIndex=BID_ORDER.indexOf(currentBid);let buttonsHTML='<button class="bid-btn pass" data-bid="PASSE">Pass</button>';for(let i=currentBidIndex+1;i<BID_ORDER.length;i++){const bidType=BID_ORDER[i];const bid=BIDS[bidType];buttonsHTML+=`<button class="bid-btn" data-bid="${bidType}">${bid.label}</button>`}const modal=createModal("YOUR BID",`
            <div class="modal-content">
                <p style="margin-bottom: 16px; text-align: center;">Current bid: ${BIDS[currentBid].name}</p>
                <div class="bid-options">
                    ${buttonsHTML}
                </div>
                <p style="margin-top: 12px; text-align: center; font-size: 10px; color: #8a7fa8;">Press Escape to close</p>
            </div>
        `);modal.querySelectorAll(".bid-btn").forEach(btn=>{btn.addEventListener("click",()=>{const bidType=btn.dataset.bid;const result=game.placeBid(0,bidType);modal.remove();bidBtn.style.display="none";if(bidType!=="PASSE"){showMessage(`You bid: ${BIDS[bidType].name}`)}else{showMessage("You passed")}later(()=>afterBid(result),500)})})}function showDogExchange(takerIndex){if(takerIndex===0){showMessage("Click 6 cards from your hand to discard");showDogDiscardUI()}else{renderDog(true);showMessage(`${PLAYER_NAMES[POSITIONS[takerIndex]]} takes the dog`);later(()=>{const state=game.getState();const hand=state.hands[takerIndex];const discards=TarotAI.selectDogCards(hand,state.tricksWon[takerIndex]);game.takerDiscard(discards.map(c=>c.id));renderDog(false);renderAllHands();startTrickPlay()},2e3)}}function showDogDiscardUI(){const state=game.getState();const hand=state.hands[0];let selected=[];renderDog(true);renderPlayerHandSelectable(hand,selected,cardId=>{if(selected.includes(cardId)){selected=selected.filter(id=>id!==cardId)}else if(selected.length<DOG_SIZE){selected.push(cardId)}playerHandEl.querySelectorAll(".t-card").forEach(el=>{el.classList.toggle("selected",selected.includes(el.dataset.cardId))});updateActionButtons([{text:`Confirm (${selected.length}/${DOG_SIZE})`,class:selected.length===DOG_SIZE?"primary":"",disabled:selected.length!==DOG_SIZE,action:()=>{const result=game.takerDiscard(selected);if(result===false){showMessage("No Kings or Oudlers, and trumps only if you must!");return}renderDog(false);renderAllHands();clearActionButtons();startTrickPlay()}}])})}let poigneesShown=false;function askPoignee(){const offer=game.poigneeOffer;const modal=createModal("POIGNÉE",`
            <div class="modal-content" style="text-align: center;">
                <p>You hold ${offer.poignee.trumps}+ trumps: a poignée worth ${offer.poignee.points}.</p>
                <p style="margin-top: 8px;">Declare it, and show these to the table?</p>
                <p style="margin-top: 8px; color: var(--gold);">${offer.cards.map(c=>c.displayName).join(", ")}</p>
            </div>
        `,false);const buttons=modal.querySelector(".modal-buttons");for(const[label,yes]of[["Declare",true],["Decline",false]]){const b=document.createElement("button");b.textContent=label;b.dataset.poignee=yes?"declare":"decline";b.addEventListener("click",()=>{modal.remove();game.declarePoignee(yes);startTrickPlay()});buttons.appendChild(b)}}function announcePoignees(then){const who=p=>p===0?"You":PLAYER_NAMES[POSITIONS[p]];const modal=createModal("POIGNÉES",`
            <div class="modal-content" style="text-align: center;">
                ${game.poignees.map(d=>`
                    <p style="margin-top: 8px;">${who(d.player)} ${d.player===0?"show":"shows"} a poignée (${d.poignee.points}):</p>
                    <p style="color: var(--gold);">${d.cards.map(c=>c.displayName).join(", ")}</p>
                `).join("")}
            </div>
        `,false);const ok=document.createElement("button");ok.textContent="Play";ok.dataset.poignee="ok";ok.addEventListener("click",()=>{modal.remove();then()});modal.querySelector(".modal-buttons").appendChild(ok)}function startTrickPlay(){if(game.poigneeOffer){askPoignee();return}if(game.trickNumber===1&&!poigneesShown){poigneesShown=true;if(game.poignees.length){announcePoignees(startTrickPlay);return}}showMessage(`Trick ${game.trickNumber}: Player ${game.currentPlayer+1} leads`);renderCurrentTrick();if(game.currentPlayer===0){enablePlayerCardPlay()}else{aiPlayCard()}}function aiPlayCard(){const state=game.getState();const playerIdx=state.currentPlayer;const hand=state.hands[playerIdx];later(()=>{const card=TarotAI.chooseCard(hand,state.currentTrick,state.history,playerIdx);if(!card)return;const result=game.playCard(playerIdx,card);if(!result)return;renderCurrentTrick(result.event==="trick_complete"?result:null);renderAllHands();if(result.event==="trick_complete"){handleTrickComplete(result)}else{if(result.nextPlayer===0){enablePlayerCardPlay()}else{aiPlayCard()}}},600)}function enablePlayerCardPlay(){const state=game.getState();const hand=state.hands[0];const legalPlays=TrickLogic.getLegalPlays(hand,state.currentTrick);showMessage(`Your turn. Play a card`);renderPlayerHandPlayable(hand,legalPlays,cardId=>{const result=game.playCard(0,cardId);if(!result)return;renderCurrentTrick(result.event==="trick_complete"?result:null);renderAllHands();if(result.event==="trick_complete"){handleTrickComplete(result)}else{aiPlayCard()}})}function handleTrickComplete(result){showMessage(`Player ${result.winner+1} wins trick ${result.trickNumber}`);if(result.nextEvent==="round_complete"){later(()=>showRoundResult(result.roundResult),1e3)}else{later(()=>startTrickPlay(),1e3)}}function bonusLines(result){const side=s=>s==="taker"?"taker":"defence";const who=p=>p===0?"You":PLAYER_NAMES[POSITIONS[p]];const lines=[];if(result.petitAuBout)lines.push(`Petit au bout: ${side(result.petitAuBoutSide)}`);for(const d of result.poignees||[])lines.push(`Poignée: ${who(d.player)}, ${d.points}`);if(result.chelem)lines.push(`Chelem: ${side(result.chelem)}`);if(result.excuseAdjustment){lines.push(`Excuse: half a point to the ${result.excuseAdjustment>0?"taker":"defence"}, in the score`)}return lines.map(l=>`<p style="color: var(--gold)">${l}</p>`).join("")}async function showRoundResult(result){const isGameOver=result.gameOver;const modalTitle=isGameOver?"GAME OVER":"ROUND RESULT";const modal=createModal(modalTitle,`
            <div class="modal-content">
                ${isGameOver?`
                    <div style="text-align: center; margin-bottom: 16px;">
                        <p style="color: var(--gold); font-size: 14px;">
                            ${result.winner===0?"YOU WIN!":`${PLAYER_NAMES[POSITIONS[result.winner]]} WINS!`}
                        </p>
                    </div>
                `:""}
                <table class="scoring-table">
                    <tr>
                        <th>Player</th>
                        <th>Role</th>
                        <th>Score</th>
                        <th>Total</th>
                    </tr>
                    ${[0,1,2,3].map(i=>`
                        <tr class="${i===result.taker?"winner":""}">
                            <td>${i===0?"You":PLAYER_NAMES[POSITIONS[i]]}</td>
                            <td>${i===result.taker?"TAKER":"DEF"}</td>
                            <td class="${result.roundScores[i]>=0?"positive":"negative"}">
                                ${result.roundScores[i]>=0?"+":""}${Math.round(result.roundScores[i])}
                            </td>
                            <td>${Math.round(result.totalScores[i])}</td>
                        </tr>
                    `).join("")}
                </table>
                <div style="text-align: center; margin-top: 16px;">
                    <p>Oudlers: ${result.oudlers} | Points: ${result.points} / ${result.threshold}</p>
                    ${bonusLines(result)}
                    <p style="color: ${result.made?"var(--green)":"var(--rose)"}">
                        ${result.made?"CONTRACT MADE!":"CONTRACT FAILED"}
                    </p>
                </div>
            </div>
        `,false);if(isGameOver){try{const initials=prompt("Enter your initials (3 chars):")||"AAA";await scoreClient.save("tarot",initials.slice(0,3).toUpperCase(),Math.round(result.totalScores[0]),{tricksWon:result.tricksWon||0,oudlers:result.oudlers,contractMet:result.made})}catch(e){console.warn("Failed to save score:",e)}}const btnContainer=modal.querySelector(".modal-buttons");if(isGameOver){const playAgainBtn=document.createElement("button");playAgainBtn.className="primary";playAgainBtn.textContent="Play Again";playAgainBtn.addEventListener("click",()=>{modal.remove();game.reset();game.newRound();dealNewHand()});btnContainer.appendChild(playAgainBtn);const menuBtnEl=document.createElement("button");menuBtnEl.textContent="Menu";menuBtnEl.addEventListener("click",()=>{modal.remove();showMenu()});btnContainer.appendChild(menuBtnEl)}else{const nextRoundBtn=document.createElement("button");nextRoundBtn.className="primary";nextRoundBtn.textContent="Next Round";nextRoundBtn.addEventListener("click",()=>{modal.remove();game.newRound();dealNewHand()});btnContainer.appendChild(nextRoundBtn)}updateScores()}function sortTarotCards(cards){const suitOrder={hearts:0,diamonds:1,clubs:2,spades:3};return[...cards].sort((a,b)=>{if(a.type==="trump"&&b.type!=="trump")return-1;if(a.type!=="trump"&&b.type==="trump")return 1;if(a.type==="trump"&&b.type==="trump")return a.number-b.number;if(a.type==="excuse")return-1;if(b.type==="excuse")return 1;if(a.type==="suited"&&b.type==="suited"){if(suitOrder[a.suit]!==suitOrder[b.suit]){return suitOrder[a.suit]-suitOrder[b.suit]}return TAROT_RANKS.indexOf(a.rank)-TAROT_RANKS.indexOf(b.rank)}return 0})}function renderAllHands(){const state=game.getState();renderPlayerHand(state.hands[0]);renderAIHand(northHandEl,state.hands[2]);renderAIHand(eastHandEl,state.hands[3]);renderAIHand(westHandEl,state.hands[1])}function renderPlayerHand(hand){playerHandEl.innerHTML="";const sorted=sortTarotCards(hand);sorted.forEach(card=>{const cardEl=createTarotCardElement(card,true);playerHandEl.appendChild(cardEl)})}function renderPlayerHandPlayable(hand,legalPlays,onPlay){playerHandEl.innerHTML="";const sorted=sortTarotCards(hand);sorted.forEach(card=>{const cardEl=createTarotCardElement(card,true);if(legalPlays.includes(card.id)){cardEl.classList.add("playable");cardEl.addEventListener("click",()=>onPlay(card.id))}playerHandEl.appendChild(cardEl)})}function renderPlayerHandSelectable(hand,selected,onSelect){playerHandEl.innerHTML="";const sorted=sortTarotCards(hand);sorted.forEach(card=>{const cardEl=createTarotCardElement(card,true);cardEl.addEventListener("click",()=>onSelect(card.id));playerHandEl.appendChild(cardEl)})}function renderAIHand(container,hand){container.innerHTML="";hand.forEach(()=>{const cardEl=TarotCardFactory.createCardBack();container.appendChild(cardEl)})}function renderDog(faceUp){dogAreaEl.innerHTML="";const state=game.getState();if(faceUp&&state.dog.length>0){const label=document.createElement("div");label.className="dog-label";label.textContent="DOG (CHIEN)";dogAreaEl.appendChild(label);state.dog.forEach(card=>{const cardEl=createTarotCardElement(card,true);cardEl.classList.add("trick-card");dogAreaEl.appendChild(cardEl)})}}function renderCurrentTrick(done){const state=game.getState();const trick=done?{cards:done.plays}:state.currentTrick;Object.values(trickSlots).forEach(slot=>{slot.innerHTML=""});trick.cards.forEach(play=>{const position=POSITIONS[play.playerIndex];const slot=trickSlots[position];if(slot){const cardEl=createTarotCardElement(play.card,true);cardEl.classList.add("trick-card");slot.appendChild(cardEl)}});const trickInfo=trickAreaEl.querySelector(".trick-info");if(trickInfo){const n=done?done.trickNumber:Math.min(game.trickNumber,TRICK_COUNT);trickInfo.textContent=`Trick ${n} of ${TRICK_COUNT}`}}function clearTrickArea(){Object.values(trickSlots).forEach(slot=>{slot.innerHTML=""})}function updateScores(){const state=game.getState();const maxScore=Math.max(...state.scores,1);scoreDisplayEl.innerHTML=[0,1,2,3].map(i=>`
            <div class="score-item ${i===state.takerIndex?"taker":""} ${state.scores[i]===maxScore?"leading":""}">
                <div class="score-name">${i===0?"YOU":PLAYER_NAMES[POSITIONS[i]]}</div>
                <div class="score-value">${Math.round(state.scores[i])}</div>
            </div>
        `).join("")}function showMessage(text){messageAreaEl.innerHTML=`<div class="game-message">${text}</div>`}function updateActionButtons(buttons){actionButtonsEl.innerHTML="";buttons.forEach(btn=>{const el=document.createElement("button");el.textContent=btn.text;el.className=`action-btn ${btn.class||""}`;el.disabled=btn.disabled;el.addEventListener("click",btn.action);actionButtonsEl.appendChild(el)})}function clearActionButtons(){actionButtonsEl.innerHTML=""}function createModal(title,content,dismissable=true){const overlay=document.createElement("div");overlay.className="modal-overlay"+(dismissable?" dismissable":"");overlay.innerHTML=`
            <div class="modal">
                <div class="modal-title">${title}</div>
                ${content}
                <div class="modal-buttons"></div>
            </div>
        `;overlay.addEventListener("click",e=>{if(dismissable&&e.target===overlay)overlay.remove()});document.body.appendChild(overlay);return overlay}function showRules(){const modal=createModal("HOW TO PLAY",`
            <div class="rules-content">
                <h3> objective </h3>
                <p>Be the first to reach ${WINNING_SCORE} points. Play as the <span class="highlight">Taker</span> against 3 AI opponents.</p>

                <h3> the deck </h3>
                <p>78 cards: 4 suits x 14 cards + 21 trumps + 1 Excuse (Fool).</p>
                <ul>
                    <li><span class="highlight">Oudlers</span>: Trump 1, Trump 21 and the Excuse, which lower your target score</li>
                    <li><span class="highlight">Court cards</span>: Jack (V), Cavalier (C), Queen (D), King (R)</li>
                </ul>

                <h3> bidding </h3>
                <p>Bid on how many points you'll collect. Higher bid = higher multiplier.</p>
                <ul>
                    <li><span class="highlight">Prise</span> (1x): Take the dog, discard 6 cards</li>
                    <li><span class="highlight">Garde</span> (2x): Same, double stakes</li>
                    <li><span class="highlight">Garde Sans</span> (4x): Dog goes to your pile unseen</li>
                    <li><span class="highlight">Garde Contre</span> (6x): Dog goes to defenders</li>
                </ul>

                <h3> trick-taking </h3>
                <p>Follow suit if possible. If void, must trump. Must overtrump if able.</p>
                <p><span class="highlight">Excuse</span>: Can be played anytime, never wins a trick.</p>

                <h3> scoring </h3>
                <p>Count card points in your tricks. Target depends on oudlers held:</p>
                <ul>
                    <li>3 oudlers: need 36 pts</li>
                    <li>2 oudlers: need 41 pts</li>
                    <li>1 oudler: need 51 pts</li>
                    <li>0 oudlers: need 56 pts</li>
                </ul>
                <p>King = 4.5pts, Queen = 3.5pts, Knight = 2.5pts, Jack = 1.5pts, others = 0.5pts</p>
            </div>
        `);const closeBtn=document.createElement("button");closeBtn.textContent="Close";closeBtn.addEventListener("click",()=>modal.remove());modal.querySelector(".modal-buttons").appendChild(closeBtn)}function showMenu(){abandonGame();bidBtn.style.display="none";bidBtn.classList.remove("bid-active");startScreen.style.display="flex";gameScreen.style.display="none"}});
