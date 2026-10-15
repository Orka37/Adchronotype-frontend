import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scorePresentation} from '../src/utils/scorePresentation.js';
import {windowSegments} from '../src/utils/calmTimeline.js';
test('score ranges preserve the 30 and 60 boundaries and handle missing data',()=>{
 assert.equal(scorePresentation(null).value,'—');
 assert.equal(scorePresentation(29.9).label,'Lower Similarity');
 assert.equal(scorePresentation(30).label,'Moderate Similarity');
 assert.equal(scorePresentation(59.9).color,'#E9A94A');
 assert.equal(scorePresentation(60).label,'Higher Similarity');
 assert.equal(scorePresentation(35.2).value,'35.2%');
});
test('calm timeline supports midnight, overnight and invalid ranges',()=>{
 assert.deepEqual(windowSegments([{start:'00:00',end:'24:00'}]),[[0,1440]]);
 assert.deepEqual(windowSegments([{start:'22:00',end:'02:00'}]),[[1320,1440],[0,120]]);
 assert.deepEqual(windowSegments([{start:'16:00',end:'19:00'}]),[[960,1140]]);
 assert.deepEqual(windowSegments([{start:'25:00',end:'26:00'},{start:'12:00',end:'12:00'}]),[]);
 assert.deepEqual(windowSegments([]),[]);
});
import {sleepQualityAverages} from '../src/utils/sleepQuality.js';
test('sleep report keeps original scores and new ratings separate',()=>{
 const result=sleepQualityAverages([{quality_score:0},{quality_score:21,quality_scale:'legacy_0_21'},{quality_score:1,quality_scale:'rating_1_10'},{quality_score:10,quality_scale:'rating_1_10'}]);
 assert.deepEqual(result,{rating_1_10:5.5,legacy_0_21:10.5});
 assert.deepEqual(sleepQualityAverages([]),{rating_1_10:null,legacy_0_21:null});
 assert.deepEqual(sleepQualityAverages([{quality_score:null},{quality_score:0,quality_scale:'rating_1_10'},{quality_score:11,quality_scale:'rating_1_10'}]),{rating_1_10:null,legacy_0_21:null});
});
