/* Additional deterministic simulations. Merged by the build process. */
Object.assign(GENERATORS, {
  'consistent-hash': (p) => {
    const keys = (p.keys || [12,35,60,92]).slice(0,6).map(x => ((Number(x)%100)+100)%100);
    const nodes = [{id:'node-a',slot:16},{id:'node-b',slot:48},{id:'node-c',slot:80}];
    const added = {id:'node-d',slot:64};
    const owner = (key,list) => [...list].sort((a,b)=>a.slot-b.slot).find(n=>n.slot>=key) || [...list].sort((a,b)=>a.slot-b.slot)[0];
    const actors=[{id:'ring',kind:'ring',x:290,y:245,r:165},{id:'ring-label',kind:'text',x:290,y:235,text:'Clockwise →'},{id:'ring-slots',kind:'text',x:290,y:263,text:'100 hash positions'},
      {id:'keys',kind:'cells',x:610,y:120,cell:44,values:keys,pointers:[]},
      {id:'mapping',kind:'store',x:740,y:295,w:360,h:260,label:'Key → owner',rows:[]}];
    for(const n of [...nodes,added]) {const a=n.slot/100*Math.PI*2-Math.PI/2;actors.push({id:n.id,kind:'circle',x:290+165*Math.cos(a),y:245+165*Math.sin(a),r:28,label:n.id.slice(-1).toUpperCase(),sub:`slot ${n.slot}`,tone:n===added?'muted':null});}
    const before=keys.map(k=>`${k} → ${owner(k,nodes).id.slice(-1).toUpperCase()}`);
    const after=keys.map(k=>`${k} → ${owner(k,[...nodes,added]).id.slice(-1).toUpperCase()}`);
    const moved=keys.filter(k=>owner(k,nodes).id!==owner(k,[...nodes,added]).id);
    const beats=[{title:'Place servers on a hash ring',text:'Hash a key, then walk clockwise to the first server at or after that position. After slot 99, wrap back to slot 0.',dur:2000,lines:[1,2],actions:[]},
      {title:'Route each key to its current owner',text:`The keys map to A, B or C. For example, ${keys[0] ?? 0} goes to ${owner(keys[0] ?? 0,nodes).id.slice(-1).toUpperCase()}. D has not joined yet.`,dur:2400,lines:[2,3],actions:[{do:'rows',actor:'mapping',value:before}]},
      {title:'A new server joins at slot 64',text:'D takes ownership of the interval after B at 48 through D at 64. Ownership elsewhere stays the same.',dur:2300,lines:[4],actions:[{do:'tone',actor:'node-d',tone:'mechanism'}]},
      {title:`${moved.length} of ${keys.length} keys move`,text:`Only keys in (48,64] move from C to D${moved.length?`: ${moved.join(', ')}`:'. None of these sample keys lie in that interval'}. Real systems use virtual nodes for a more even distribution.`,dur:2600,lines:[5],actions:[{do:'rows',actor:'mapping',value:after},...keys.flatMap((k,i)=>moved.includes(k)?[{do:'cells',actor:'keys',range:[i,i],tone:'warning'}]:[])]}];
    return {actors,links:[],tokens:[],beats};
  },
  'binary-search': (p) => {
    const values=(p.values || []).slice(0,10).map(Number).sort((a,b)=>a-b), target=Number(p.target);
    const actors=[{id:'array',kind:'cells',x:100,y:160,cell:70,values,pointers:[{id:'lo',label:'L',index:0},{id:'hi',label:'R',index:values.length-1,tone:'warning',side:'below'},{id:'mid',label:'M',index:0,tone:'success',side:'below'}]},
      {id:'result',kind:'box',x:480,y:340,w:460,h:80,label:'Search result',value:'pending',valueSmall:true}];
    const beats=[{title:'Keep the possible interval',text:`Search the sorted values for ${target}. Anything outside [L,R] has already been ruled out.`,dur:1500,lines:[1,2],actions:[]}];let lo=0,hi=values.length-1,found=-1;
    while(lo<=hi){const mid=Math.floor((lo+hi)/2),v=values[mid];beats.push({title:`Compare ${v} with ${target}`,text:v===target?`The midpoint contains ${target}. Return index ${mid}.`:v<target?`${v} is smaller. Sorted order rules out every index through ${mid}; move L to ${mid+1}.`:`${v} is larger. Rule out every index from ${mid} onwards; move R to ${mid-1}.`,dur:2000,lines:[3,4,5],actions:[{do:'pointer',actor:'array',pointer:'lo',index:lo},{do:'pointer',actor:'array',pointer:'hi',index:hi},{do:'pointer',actor:'array',pointer:'mid',index:mid},{do:'cells',actor:'array',range:[mid,mid],tone:v===target?'success':'mechanism'}]});if(v===target){found=mid;break;}if(v<target)lo=mid+1;else hi=mid-1;}
    beats.push({title:found<0?'The interval is empty':'Return the matching index',text:found<0?`No candidate remains. ${target} is absent, so return -1.`:`Index ${found} contains the target. Each previous comparison discarded roughly half the candidates.`,dur:1600,lines:[6],actions:[{do:'set',actor:'result',value:found},{do:'tone',actor:'result',tone:found<0?'warning':'success'}]});
    return {actors,links:[],tokens:[],beats};
  },
  'islands': (p) => {
    const grid=(p.grid || ['1100','0101','0011']).slice(0,4).map(row=>String(row).slice(0,5).split('').map(x=>x==='1'?1:0));
    const width=grid[0]?.length || 0;
    if(!width || grid.some(row=>row.length!==width))throw Error('Use equal-width rows of 0 and 1');
    const actors=grid.map((row,r)=>({id:`row-${r}`,kind:'cells',x:150,y:110+r*80,cell:60,values:row,pointers:[]}));
    actors.push({id:'count',kind:'box',x:730,y:170,w:250,h:90,label:'Islands',value:0},{id:'frontier',kind:'store',x:730,y:340,w:320,h:180,label:'DFS stack (row,col)',rows:[]});
    const beats=[{title:'A grid of land and water',text:'1 is land and 0 is water. Count groups connected up, down, left or right. Diagonal contact does not connect two islands.',dur:1800,lines:[1],actions:[]}];
    const seen=new Set();let count=0;
    for(let r=0;r<grid.length;r++)for(let c=0;c<width;c++){
      if(!grid[r][c]||seen.has(`${r},${c}`))continue;
      count++;let stack=[[r,c]];seen.add(`${r},${c}`);
      beats.push({title:`Start island ${count}`,text:`Cell (${r},${c}) is unvisited land. Increase the count once, then visit all land reachable from this cell.`,dur:1700,lines:[2,3],actions:[{do:'set',actor:'count',value:count}]});
      while(stack.length){const [y,x]=stack.pop();for(const [dy,dx]of[[1,0],[-1,0],[0,1],[0,-1]]){const ny=y+dy,nx=x+dx,k=`${ny},${nx}`;if(grid[ny]?.[nx]===1&&!seen.has(k)){seen.add(k);stack.push([ny,nx]);}}
        beats.push({title:`Visit (${y},${x})`,text:`Mark this cell so it cannot be counted again. Add its unvisited land neighbours to the stack. ${stack.length} cells remain on the frontier.`,dur:1400,lines:[4,5],actions:[{do:'cells',actor:`row-${y}`,range:[x,x],tone:'success'},{do:'rows',actor:'frontier',value:stack.slice(-4).map(([a,b])=>`(${a},${b})`)}]});}
    }
    beats.push({title:`${count} connected ${count===1?'island':'islands'}`,text:'Every land cell has been visited once. Water and previously visited land never start another search.',dur:1600,lines:[6],actions:[{do:'tone',actor:'count',tone:'success'}]});return {actors,links:[],tokens:[],beats};
  }
});

Object.assign(GENERATORS, {
  'linked-list': p => {
    const values=(p.values||[]).slice(0,6), actors=values.map((v,i)=>({id:`node-${i}`,kind:'box',x:100+i*145,y:180,w:90,h:64,label:`node ${i}`,value:v}));
    actors.push({id:'prev',kind:'box',x:250,y:360,w:280,h:70,label:'prev',value:'null',valueSmall:true},{id:'next',kind:'box',x:650,y:360,w:280,h:70,label:'saved next',value:'null',valueSmall:true});
    const links=[];for(let i=0;i<values.length-1;i++){links.push({id:`forward-${i}`,from:`node-${i}`,to:`node-${i+1}`,bend:-35},{id:`back-${i}`,from:`node-${i+1}`,to:`node-${i}`,bend:35,tone:'hidden'});}
    const beats=[{title:'Keep the rest of the list reachable',text:'Before reversing a next pointer, save it. prev is the head of the already reversed prefix.',dur:1800,lines:[1,2],actions:[]}];
    for(let i=0;i<values.length;i++)beats.push({title:`Reverse node ${i}`,text:`Save ${i+1<values.length?`node ${i+1}`:'null'}, point node ${i} back to ${i?`node ${i-1}`:'null'}, then advance. The remaining suffix is still reachable.`,dur:2200,lines:[4,5,6,7],actions:[{do:'set',actor:'next',value:i+1<values.length?`node ${i+1}`:'null',at:[0,.2]},...(i<values.length-1?[{do:'tone',link:`forward-${i}`,tone:'hidden',at:[.3,.4]}]:[]),...(i?[{do:'tone',link:`back-${i-1}`,tone:'success',at:[.3,.4]}]:[]),{do:'tone',actor:`node-${i}`,tone:'success',at:[.4,.5]},{do:'set',actor:'prev',value:`node ${i}`,at:[.7,.9]}]});
    beats.push({title:'Return the new head',text:values.length?`The list now reads ${[...values].reverse().join(' → ')}. Every next pointer changed once.`:'An empty list stays empty. Return null without dereferencing a node.',dur:1700,lines:[9],actions:[{do:'tone',actor:'prev',tone:'success'}]});return {actors,links,beats};
  },
  'coin-change': p => {
    const amount=Math.max(0,Math.min(10,p.amount)),coins=[...new Set(p.coins||[])].filter(c=>Number.isInteger(c)&&c>0).slice(0,4),dp=Array(amount+1).fill(Infinity);dp[0]=0;
    const actors=[{id:'dp',kind:'cells',x:65,y:170,cell:76,values:dp.map(v=>v===Infinity?'∞':v),pointers:[{id:'amount',label:'amount',index:0}]},{id:'candidate',kind:'box',x:270,y:350,w:350,h:80,label:'Candidate',value:'start',valueSmall:true},{id:'answer',kind:'box',x:720,y:350,w:330,h:80,label:'Minimum coins',value:'pending',valueSmall:true}];
    const beats=[{title:'Solve smaller amounts first',text:`Coins: ${coins.join(', ')||'none'}. dp[0] = 0; every other amount starts unreachable. Each column stores the fewest coins needed for that amount.`,dur:1800,lines:[1,2],actions:[]}];
    for(let a=1;a<=amount;a++)for(const c of coins){if(c>a)continue;const before=dp[a],candidate=dp[a-c]+1;dp[a]=Math.min(before,candidate);beats.push({title:`Amount ${a}, try coin ${c}`,text:`Use the answer for ${a-c}, then add one coin of value ${c}. ${candidate===Infinity?'That smaller amount is unreachable.':`Candidate ${candidate}; keep ${dp[a]}.`}`,dur:1400,lines:[3,4,5],actions:[{do:'pointer',actor:'dp',pointer:'amount',index:a},{do:'cells',actor:'dp',range:[a-c,a-c],tone:'mechanism'},{do:'set',actor:'candidate',value:`dp[${a-c}] + 1`,at:[0,.3]},{do:'cellValue',actor:'dp',index:a,value:dp[a]===Infinity?'∞':dp[a],at:[.6,.8]}]});}
    const answer=Number.isFinite(dp[amount])?dp[amount]:-1;beats.push({title:answer<0?'The amount is unreachable':`Minimum: ${answer} coins`,text:answer<0?'No combination of the supplied coins produces this amount. Return -1.':`The table contains an optimal answer for ${amount}. Reusing smaller answers avoids enumerating every combination.`,dur:1700,lines:[8],actions:[{do:'set',actor:'answer',value:answer},{do:'tone',actor:'answer',tone:answer<0?'warning':'success'}]});return {actors,beats};
  },
  'graph-bfs': p => {
    const edges=p.mode==='disconnected'?[[0,1],[0,2],[1,3]]:[[0,1],[0,2],[1,3],[2,3],[3,4],...(p.mode==='cycle'?[[3,1]]:[])];
    const points=[[100,200],[330,85],[330,315],[560,200],[790,200]];
    const actors=points.map(([x,y],i)=>({id:`node-${i}`,kind:'circle',x,y,r:27,label:String(i)}));actors.push({id:'queue',kind:'store',x:270,y:480,w:360,h:200,label:'Queue (front first)',rows:['0']},{id:'distance',kind:'store',x:700,y:480,w:360,h:200,label:'Shortest distance from 0',rows:['0 → 0']});
    const links=edges.map(([a,b],i)=>({id:`edge-${i}`,from:`node-${a}`,to:`node-${b}`,bend:(a===3&&b===1)?65:0})),queue=[0],dist=new Map([[0,0]]);
    const beats=[{title:'Visit in distance order',text:'Start with node 0. The queue keeps every node at distance d ahead of nodes at distance d+1. This graph is directed and unweighted.',dur:1600,lines:[1,2],actions:[]}];
    while(queue.length){const node=queue.shift(),acts=[{do:'tone',actor:`node-${node}`,tone:'success'}];for(const[a,b]of edges){if(a!==node||dist.has(b))continue;dist.set(b,dist.get(node)+1);queue.push(b);acts.push({do:'tone',actor:`node-${b}`,tone:'mechanism'});}acts.push({do:'rows',actor:'queue',value:queue.map(String)},{do:'rows',actor:'distance',value:[...dist].map(([n,d])=>`${n} → ${d}`)});beats.push({title:`Visit node ${node}`,text:`Remove ${node} from the front. Enqueue each unseen outgoing neighbour and record its distance once.${p.mode==='cycle'&&node===3?' The edge back to 1 is skipped because 1 is already seen.':' Seen nodes never enter the queue again.'}`,dur:1900,lines:[3,4,5,6],actions:acts});}
    beats.push({title:dist.has(4)?`Node 4 is ${dist.get(4)} edges away`:'Node 4 is unreachable',text:dist.has(4)?'The first discovered path is shortest because every edge has the same cost. Weighted edges require a different algorithm.':'The queue is empty. No directed path from node 0 reaches node 4.',dur:1800,lines:[9],actions:[]});return {actors,links,beats};
  }
});
