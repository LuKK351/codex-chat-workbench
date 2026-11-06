'use strict';
// Exercise the actual renderers with synthetic data; no browser/private fixture required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const C=require('../assets/template/core.js');
const source=fs.readFileSync(path.join(__dirname,'../assets/template/app.js'),'utf8');
const app={innerHTML:''};
const sandbox={Workbench:C,URLSearchParams,document:{querySelector:()=>app},localStorage:{getItem:()=>null},location:{hash:'#tab=all'}};
vm.createContext(sandbox);
vm.runInContext(source.slice(0,source.indexOf('function showAbout(')),sandbox);
assert.equal(sandbox.matchEvidence({title:'确认 V03'},'讨论标题：确认 V03'),'');
assert.equal(sandbox.matchEvidence({title:'确认 V03'},'讨论标题: 确认 Ｖ０３'),'');
assert.equal(sandbox.matchEvidence({title:'确认 V03'},'确认 V03'),'');
assert.equal(sandbox.matchEvidence({title:'确认 V03'},'讨论小结：确认 V03，仍需用户核对。'),'讨论小结：确认 V03，仍需用户核对。');
assert.equal(sandbox.matchEvidence({title:'确认 V03'},'讨论标题：确认 V03 后的封面'),'讨论标题：确认 V03 后的封面');
assert.match(sandbox.background({summary:'当前进展',recap:'历史背景',status:'助手报告，未独立核验'}),/历史背景.*助手报告，未独立核验/);
assert.equal(sandbox.background({summary:'当前进展',status:'当前进展'}),'');
assert.equal(sandbox.background({summary:'正文',recap:'',openQuestion:'   ',status:'讨论记录'}),'');
assert.match(sandbox.background({summary:'正文',openQuestion:'尚待核实的例子',status:'讨论记录'}),/尚待核实的例子/);
const item={id:'matter',title:'事项',nodes:[{id:'a'},{id:'b'},{id:'c'}],decisions:[
 {node:'a',text:'older',label:'用户要求',date:'2026-10-21T08:00:00+08:00'},
 {node:'b',text:'newest',label:'助手报告',date:'2026-10-21T01:00:00Z'},
 {node:'c',text:'oldest <script>',label:'用户选择',date:'2026-10-20T08:00:00+08:00'}]};
const original=JSON.stringify(item);
let html=sandbox.decisions(item,{q:'测试',returnTo:'#q=测试'});
assert.ok(html.indexOf('newest')<html.indexOf('older')); // Actual instants, not ISO string order.
assert.ok(html.indexOf('older')<html.indexOf('<details'));
assert.ok(html.indexOf('oldest')>html.indexOf('<details'));
assert.match(html,/查看其余 1 条/);assert.ok(!html.includes('<script>'));
assert.ok(html.includes('node=b'));assert.ok(html.includes('returnTo='));
assert.equal(JSON.stringify(item),original); // Rendering never rewrites source chronology or evidence.
assert.equal(sandbox.decisions({...item,decisions:[]}), '');
assert.ok(!sandbox.decisions({...item,decisions:item.decisions.slice(0,1)}).includes('<details'));
assert.ok(!sandbox.decisions({...item,decisions:item.decisions.slice(0,2)}).includes('<details'));
sandbox.fixture={items:[item],legacyItems:[],threads:[{id:'thread',title:'窗口 <测试>',checked:'2026-11-02',messages:[{id:'message',role:'user',date:'2026-10-20T08:00:00+08:00',text:'原文'}]}]};
vm.runInContext('data=fixture',sandbox);
sandbox.sourceReader({thread:'thread',message:'message',back:'#item=matter&node=b&returnTo=%23q%3Dtest'});
assert.match(app.innerHTML,/class="source-return"/);assert.match(app.innerHTML,/返回事项/);
assert.match(app.innerHTML,/href="#item=matter&amp;node=b&amp;returnTo=%23q%3Dtest"/);
assert.match(app.innerHTML,/窗口 &lt;测试&gt;/);assert.match(app.innerHTML,/transcript-message target/);
sandbox.sourceReader({thread:'thread',back:'#q=test&range=lastWeek'});
assert.match(app.innerHTML,/返回搜索结果/);assert.match(app.innerHTML,/range=lastWeek/);
sandbox.sourceReader({thread:'thread',back:'https://example.com'});
assert.match(app.innerHTML,/href="#sources=1"/);assert.ok(!app.innerHTML.includes('href="https://example.com"'));
// Detail attribution opens the actual source thread; local reading keeps its message target.
const threadId='00000000-0000-4000-8000-000000000001';
const node={id:'entry',title:'讨论',thread:threadId,sourceTitle:'窗口 <测试>',messageId:'message',date:'2026-10-24T10:38:00+08:00',quote:'原话'};
sandbox.fixture={items:[{...item,date:node.date,nodes:[node],decisions:[],summary:'小结'}],threads:[{id:threadId}],snapshot:'2026-11-03'};
vm.runInContext('data=fixture',sandbox);
sandbox.detail({item:'matter',node:'entry'});
assert.ok(app.innerHTML.includes(`href="codex://threads/${threadId}"`));
assert.match(app.innerHTML,/aria-label="在 Codex 打开：窗口 &lt;测试&gt;"/);
assert.match(app.innerHTML,/message=message/);
assert.ok(!app.innerHTML.includes('可从列表的来源对话名'));
node.thread='export-without-uuid';
sandbox.detail({item:'matter',node:'entry'});
assert.ok(!app.innerHTML.includes('codex://threads/'));
assert.match(app.innerHTML,/来源对话<\/span><span>窗口 &lt;测试&gt;<\/span>/);
// Raw-only search results and deep transcript positions must offer the same native route.
const rawThread={id:threadId,title:'议题讨论 <写作>',date:node.date,checked:'2026-11-03',messages:[{id:'raw-hit',role:'user',date:node.date,text:'为什么还需要练习个人写作'}]};
sandbox.fixture={items:[],legacyItems:[],threads:[rawThread],snapshot:'2026-11-03'};
vm.runInContext('data=fixture',sandbox);
sandbox.search({q:'个人写作',range:'any',back:'#tab=all'});
assert.match(app.innerHTML,/>对话正文匹配<\/h2>/);
assert.ok(!app.innerHTML.includes('id="matching-matters"'));
assert.match(app.innerHTML,/阅读前后文/);
assert.ok(app.innerHTML.includes(`href="codex://threads/${threadId}"`));
assert.match(app.innerHTML,/message=raw-hit/);
sandbox.sourceReader({thread:threadId,message:'raw-hit',back:'#q=个人写作&range=any'});
assert.ok(app.innerHTML.slice(0,app.innerHTML.indexOf('</nav>')).includes(`href="codex://threads/${threadId}"`));
assert.match(app.innerHTML,/返回搜索结果/);
assert.match(app.innerHTML,/id="message-raw-hit"[^>]*class="transcript-message target"/);
sandbox.sourceIndex({sources:'1'});
assert.ok(app.innerHTML.includes(`href="codex://threads/${threadId}"`));
assert.match(app.innerHTML,/href="#thread=00000000/);
// Imported sources without an authentic thread UUID retain local reading only.
sandbox.fixture={...sandbox.fixture,threads:[{...rawThread,id:'export-file'}]};
vm.runInContext('data=fixture',sandbox);
for(const render of [()=>sandbox.search({q:'个人写作'}),()=>sandbox.sourceReader({thread:'export-file'}),()=>sandbox.sourceIndex({sources:'1'})]){
 render();assert.ok(!app.innerHTML.includes('codex://'));assert.ok(app.innerHTML.includes('议题讨论'));
}
assert.equal(sandbox.sourceOpenLink('javascript:alert(1)','bad'),'');
assert.match(sandbox.sourceOpenLink(threadId,'窗口 <测试>'),/aria-label="在 Codex 打开：窗口 &lt;测试&gt;"/);
// A remembered window name must be visible before topic, fuzzy, and quote-only results.
const query='Codex 对话整理工作台';
const namedThread={...rawThread,title:query+'｜内容创作',messages:[{...rawThread.messages[0],text:'已保存封面底板'}]};
const exactThread={...rawThread,id:'00000000-0000-4000-8000-000000000002',title:query,messages:[{...rawThread.messages[0],id:'exact',text:'确认布局'}]};
const scatteredThread={...rawThread,id:'00000000-0000-4000-8000-000000000003',title:'Codex 使用记录与对话整理工作台',messages:[{...rawThread.messages[0],id:'scattered',text:'整理记录'}]};
const quoteNode={...node,thread:threadId,sourceTitle:namedThread.title,quote:query,title:'保存底板'};
const quoteThing={...item,id:'video',title:'制作分享视频',summary:'已保存封面',date:node.date,decisions:[],nodes:[quoteNode]};
const topicThing={...quoteThing,id:'design',title:'设计 '+query,nodes:[{...quoteNode,id:'design-node',messageId:'design-message'}]};
// Give the quote its own source message, while the window's other text does not match at all.
namedThread.messages.push({id:quoteNode.messageId,role:'user',date:node.date,text:query});
sandbox.fixture={items:[quoteThing,topicThing],threads:[scatteredThread,namedThread,exactThread],snapshot:'2026-11-03'};
vm.runInContext('data=fixture',sandbox);
const ranked=C.searchData(sandbox.fixture,query,undefined,'any');
assert.deepEqual(ranked.sources.filter(s=>s.titleMatch).map(s=>s.thread.id),[exactThread.id,namedThread.id,scatteredThread.id]);
assert.equal(ranked.groups.find(g=>g.thing.id==='video').tier,1); // A broad window title cannot promote every topic within it.
sandbox.search({q:query,range:'any'});
assert.match(app.innerHTML,/>窗口名称匹配<\/h2>/);
assert.ok(!app.innerHTML.includes('class="result search-group"'));
assert.ok(app.innerHTML.includes('codex://threads/'+threadId));
assert.ok(app.innerHTML.includes('message='+quoteNode.messageId)); // Also present in a curated matter.
sandbox.search({q:query,range:'any',results:'matters'});
assert.match(app.innerHTML,/>事项标题匹配<\/h2>/);
assert.match(app.innerHTML,/>事项引用的原话匹配<\/h2>/);
assert.ok(!app.innerHTML.includes('class="source-result-head"'));
// A window whose only matching passage is quoted by a matter is still a full-text result.
sandbox.fixture={items:[quoteThing],threads:[{...namedThread,title:'拍摄讨论'}],snapshot:'2026-11-03'};
vm.runInContext('data=fixture',sandbox);
sandbox.search({q:query,range:'any',results:'windows'});
assert.match(app.innerHTML,/>对话正文匹配<\/h2>/);
assert.ok(app.innerHTML.includes('message='+quoteNode.messageId));
sandbox.search({q:query,range:'any',results:'matters'});
assert.match(app.innerHTML,/>事项引用的原话匹配<\/h2>/);
// Name-only hits work even with no matching messages or curated matters, including spacing/case.
sandbox.fixture={items:[],threads:[exactThread],snapshot:'2026-11-03'};
vm.runInContext('data=fixture',sandbox);
sandbox.search({q:'ＣＯＤＥＸ对话整理工作台',range:'any'});
assert.match(app.innerHTML,/>窗口名称匹配<\/h2>/);
assert.ok(!app.innerHTML.includes('没有找到匹配的内容'));
assert.equal(C.searchData(sandbox.fixture,query,'2026-11-05T12:00:00+08:00','today').sources.length,0); // Date filters still apply.
console.log('PASS name-first search ranking, name-only/date scope, reading routes, raw-only search, sticky native shortcut, message targeting, and safe export fallback');
