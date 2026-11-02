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
console.log('PASS duplicate search evidence, decision preview/sorting/escaping, immutable source data, and contextual source-return routes');
