import test from 'node:test'
import assert from 'node:assert/strict'
import { assessEvidenceCoverage as assessJobMatch, assessJobMatch as assessAts, validateJobProfile } from '../src/utils/jobMatch.js'
const r = (category,state,evidence='') => ({label:'Example',category,state,evidence})
test('weights direct and transferable evidence by category',()=>{
 const result=assessJobMatch({requirements:[r('Hard skills','evidenced','SAP'),r('Soft skills','transferable','teams'),r('Qualifications','gap')]},{experience:['SAP','teams']})
 assert.equal(result.score,50)
 assert.equal(result.categories[0].score,100)
 assert.equal(result.categories[1].score,50)
})
test('a changed CV pauses the score rather than retaining old evidence',()=>{
 const result=assessJobMatch({requirements:[r('Hard skills','evidenced','SAP')]},{experience:['Excel']})
 assert.equal(result.score,null); assert.equal(result.requirements[0].needsReview,true)
})
test('keyword stuffing in summary or skills cannot validate employment evidence',()=>{
 assert.equal(assessJobMatch({requirements:[r('Hard skills','evidenced','SQL')]},{summary:'SQL',skills:['SQL']}).score,null)
})
test('no brief produces no score; gaps count and evidence is required',()=>{
 assert.equal(assessJobMatch(null,{}),null)
 assert.throws(()=>validateJobProfile({title:'Test',requirements:[r('Hard skills','evidenced')]}),/quote/)
 const result=assessJobMatch({requirements:[{...r('Hard skills','gap'),essential:true}]},{})
 assert.equal(result.score,0);assert.equal(result.essentialGaps,1)
})

test('quotes and line breaks in real CV evidence remain matchable',()=>{
 const evidence='Reviewed "SAP" records\nwith teams'
 assert.equal(assessJobMatch({requirements:[r('Hard skills','evidenced',evidence)]},{experience:[evidence]}).score,100)
})

test('a job can be saved with only a description, and its board summary omits the detail',async()=>{
 const { summarizeJobProfile } = await import('../src/utils/jobMatch.js')
 const profile=validateJobProfile({title:' QA Engineer ',company:'Acme',sourceUrl:'https://example.com/job',description:'  Duties:\ntesting  '})
 assert.equal(profile.description,'Duties:\ntesting'); assert.deepEqual(profile.requirements,[])
 assert.equal(assessJobMatch(profile,{}),null)
 assert.deepEqual(summarizeJobProfile({...profile,requirements:[r('Hard skills','gap')]}),{title:'QA Engineer',company:'Acme',location:'',sourceUrl:'https://example.com/job'})
 assert.equal(summarizeJobProfile(null),null)
 assert.throws(()=>validateJobProfile({title:'T',requirements:Array.from({length:41},()=>r('Hard skills','gap'))}),/up to 40/)
})

const k=(label,extra={})=>({label,category:'Hard skills',...extra})
test('ATS score is the weighted share of job keywords found in the printed CV text',()=>{
 const cv={summary:'QA engineer',skills:{testing:['Regression testing','SQL']},experience:[{highlights:['Tracked defects in Jira and tested APIs.']}],notes:'Selenium'}
 const result=assessAts({requirements:[k('Regression testing'),k('SQL'),k('Selenium'),k('Teamwork',{category:'Soft skills'})]},cv)
 assert.deepEqual(result.requirements.map((item)=>item.ats),['found','found','missing','missing'])
 assert.equal(result.score,57) // 4 of 7 weighted points; private notes are not CV text
 assert.equal(result.categories[0].score,67); assert.equal(result.categories[1].score,0)
})
test('ATS matching handles word forms, alternatives, aliases, symbols and essential weighting',()=>{
 const cv={experience:['Tested APIs and tracked defects. Built services in C++ and Node.js. Wrote test plans for the team.']}
 const status=(item)=>assessAts({requirements:[item]},cv).requirements[0].ats
 assert.equal(status(k('API testing')),'partial') // both words present, not as a phrase
 assert.equal(status(k('Defect tracking')),'partial')
 assert.equal(status(k('Python / C++')),'found') // either alternative is enough
 assert.equal(status(k('Quality assurance',{aliases:['test plans']})),'found')
 assert.equal(status(k('Node.js')),'found'); assert.equal(status(k('C#')),'missing'); assert.equal(status(k('Java')),'missing')
 const weighted=assessAts({requirements:[k('C++',{essential:true}),k('Rust')]},cv)
 assert.equal(weighted.score,67); assert.equal(weighted.essentialMissing,0)
 assert.equal(assessAts({requirements:[k('Rust',{essential:true})]},cv).essentialMissing,1)
})
test('a keyword needs no evidence rating, and aliases are cleaned',()=>{
 const profile=validateJobProfile({title:'T',requirements:[{label:' SQL ',category:'Hard skills',aliases:[' Structured Query Language ','',5,'Structured Query Language']}]})
 assert.deepEqual(profile.requirements[0],{label:'SQL',aliases:['Structured Query Language'],category:'Hard skills',state:'gap',evidence:'',essential:false})
})
