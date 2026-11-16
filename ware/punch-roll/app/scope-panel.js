(function(){"use strict";const App=window.PunchRoll=window.PunchRoll||{};const K=window.MagmaKit;const $=id=>document.getElementById(id);function create(env){const{prefs:PREFS,status}=env;window.AdScope.defineScope("ad-scope");const scope=$("scope");{const saved=(PREFS.read()||{}).scopeSettings;if(saved&&typeof saved==="object")scope.view.set(saved)}scope.addEventListener("scopechange",e=>PREFS.patch({scopeSettings:e.detail}));const SW=K.scopeWindow.create({name:"punch-roll-scope",title:"PUNCH//ROLL scope",style:`
                html, body { height: 100%; margin: 0; background: var(--bg); color: var(--text); }
                body { display: flex; flex-direction: column; }
                .scope-bar {
                    display: flex; align-items: center; gap: 0.8rem;
                    padding: 0.35rem 0.6rem; border-bottom: 1px solid var(--border);
                    font: 11px/1.4 'Press Start 2P', monospace;
                }
                .scope-bar .spacer { flex: 1; }
                .scope-bar label { display: flex; align-items: center; gap: 0.35rem; cursor: pointer; }
                .scope-bar [hidden] { display: none; }
                #scope { position: static; flex: 1; min-height: 0; height: auto; border-top: 0; }
            `,body:`
                <div class="scope-bar">
                    <label id="on-top-row" hidden><input id="on-top" type="checkbox"> On top</label>
                    <span class="spacer"></span>
                    <button id="dock" type="button" title="Put the scope back under the roll">Dock</button>
                </div>
                <ad-scope id="scope"></ad-scope>`,closeNative:App.fs?()=>App.fs.scopeClose():null});App.scopeWindow=SW;const popBtn=$("btn-scope-pop");popBtn.hidden=!SW.available;function showScope(on){const popped=on&&SW.isOpen;scope.hidden=!on||popped;$("btn-scope").setAttribute("aria-pressed",String(on));popBtn.setAttribute("aria-pressed",String(popped));scope.source=on&&!popped?env.tap():null;if(!on)SW.close()}let scopeOn=false;function setScope(on){scopeOn=on;showScope(on);PREFS.patch({scope:on})}$("btn-scope").addEventListener("click",()=>setScope(!scopeOn));function popOut(){const prefs=PREFS.read()||{};const onTop=App.fs?prefs.scopeOnTop!==false:null;SW.open({geometry:prefs.scopeWindow,settings:prefs.scopeSettings,source:env.tap(),onTop,onchange:s=>{PREFS.patch({scopeSettings:s});scope.view.set(s)},onTopChange:on=>{PREFS.patch({scopeOnTop:on});App.fs.scopeOnTop(on).catch(e=>console.error("scope on top:",e))},onclose:g=>{PREFS.patch({scopeWindow:g});showScope(scopeOn)}}).then(el=>{if(!el){status("The scope window could not open.");showScope(scopeOn);return}if(onTop)App.fs.scopeOnTop(true).catch(e=>console.error("scope on top:",e))});scopeOn=true;PREFS.patch({scope:true});showScope(true)}function popOrDock(){if(!SW.available){status("The scope has no window of its own here.");return}if(SW.isOpen)SW.close();else popOut()}popBtn.addEventListener("click",popOrDock);setScope((PREFS.read()||{}).scope===true);function follow(tap){if(!scope.hidden){try{scope.source=tap}catch(e){console.error("scope:",e)}}const popped=SW.element;if(popped){try{popped.source=tap}catch(e){console.error("scope window:",e)}}}return{follow,popOrDock}}App.scopePanel={create}})();
