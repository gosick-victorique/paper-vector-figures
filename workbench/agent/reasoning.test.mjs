import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReasoning,reasoningOptions,reasoningEfforts} from './reasoning.mjs';
test('default uses model default and explicit effort passes through without silent downgrade',()=>{
 assert.deepEqual(reasoningOptions({}),{});assert.deepEqual(reasoningOptions({reasoningEffort:'auto'}),{});
 for(const value of reasoningEfforts.filter(v=>v!=='auto'))assert.deepEqual(reasoningOptions({reasoningEffort:value}),{modelReasoningEffort:value});
 for(const value of ['unknown','HIGH',{},0,null])assert.throws(()=>normalizeReasoning(value));
});
