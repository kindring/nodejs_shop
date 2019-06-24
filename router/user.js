const ht=require('../storeServer.js');
const user_db=require('../dbs/user');
const art=require("art-template");
const formidable=require('formidable');
const mime=require('../mime.json');
const goods=require('../dbs/goods.js');
ht.post('/register',function(req,res){
    parseBody(req,function(body){
        body=JSON.parse(body);
        user_db.add_user(body,function(err,result){
            if(err){
                return res.end(JSON.stringify(err));
            }
            console.log(result);
            res.end(JSON.stringify({
                pid:result.pid,
                name:result.name,
            }))
        })
    });
});
ht.post('/login',function(req,res){
    console.log("登录");
    parseBody(req,function(body){
        console.log("--用户尝试登录--");
        console.log('---***---');
        if(isJSON(body)){
            user_db.login(JSON.parse(body),function(err,data){
                if(err){
                    console.log(err);
                    return res.err(err);
                }
                console.log("--登录结果--");
                console.log(data);
                console.log("--***--");
                res.writeHead(200,{
                    'Set-Cookie': ['token='+data.token, 'email='+data.email,'id='+data.pid]
                });
                res.json(data);
            })
        }else{
            return res.err({
                errCode:110,
                describe:"错误,传输格式错误",
                error:"不知道是啥"
            })
        }

    });
});
ht.post('/log',function(req,res){
    parseBody(req,function(body){
        console.log(body);
        let cookie=parseCookie(req);
        console.log(`用户自动登录的cookie\n${cookie}\n结束`);
        console.log(cookie);
        console.log("-----------------");

        let user_obj={
            token:null,
            pid:null
        };
        if(isJSON(body)){
            body=JSON.parse(body);
            user_obj.token=body.token;
            user_obj.pid=body.pid;
        }else if(cookie.token){
            user_obj.token=cookie.token;
            user_obj.pid=cookie.pid;
        }else{
            console.log("无法自动登陆,无记录");
        }
        user_db.token_login(user_obj,function(err,data){
            if(err){
                console.log(err);
                return res.err(err)
            }
            console.log("autologin");
            console.log(data);
            let cookieStr="email="+data.email+",pid="+data.pid+",token="+data.token;
            console.log("用户设置的新cookie:"+cookieStr);
            res.writeHead(200,{
                'Set-Cookie': ['token='+data.token, 'email='+data.email,'id='+data.pid]
            });
            res.end(JSON.stringify(data));
        })
    })
});
ht.get('/logout',function(req,res){
    console.log("用户注销请求");
    let query=req.Pquery;
    let cookie=parseCookie(req);
    if(query.pid===cookie.id){
        user_db.logout({
            pid:query.pid,
            token:cookie.token
        },function(err,result){
            if(err){
                res.writeHead(200,{ 'Set-Cookie': ['id=null','token=null','email=null']});
                return res.err(err);
            }
            res.writeHead(200,{ 'Set-Cookie': ['id=null','token=null','email=null']});
            res.end();
        })
    }
});
ht.get(/user/,function(req,res){
    let cookie=parseCookie(req);
    let query=req.pathQuery;
    let pid=req.pathname.replace("/user/","");
    // console.log(`query:${query}`);
    // console.log(`pid:${pid}`);
    // console.log(`cookie.token:${cookie.token}`);
    // console.log(`cookie.pid:${cookie.id}`);
    if(cookie.token&&cookie.id){
        user_db.describe({
            pid:pid,
            token:cookie.token||query,
        },function(err,data){
            console.log("个人中心验证完成");
            console.log(data);
            if(data){
                goods.find_goods(null,0,16,-1,function(err,goods_result){
                    if(err){
                        console.log("--------查找商品-------");
                        console.log(err);
                        return res.err(err);
                    }
                    res.art('user-center.html',{
                        user:{
                            pid:data.pid,
                            token:cookie.token,
                            money:data.money||0,
                            name:data.name||"无法获取用户名",
                            payNum:data.payNum||0,
                            brief:data.brief,
                            notice_msg:data.notice_msg||data.brief||"天猫双十一"
                        },
                        goods:goods_result,
                    },art.render);
                })
            }else{
                res.writeHead(302, {'Location': '/index'});
                return res.end();
            }



        });
    }else{
        console.log('-----------cookie里无数据');
        res.writeHead(302, {'Location': '/login'});
        return res.end();
    }
});
ht.get(/editor/,function(req,res){
    let cookie=parseCookie(req);
    let query=req.pathQuery;
    let pid=req.pathname.replace("/user/","");
    if(cookie.token===query&&cookie.id===pid){
        res.render('editor.html')
    }else{
    }
    res.render('editor.html')
});

ht.get('/header',function(req,res){
    let query=req.Pquery;
    user_db.find_head(query.pid,function(err,data){
        if(err){
           return res.err(err);
        }
        console.log("用户头像-------------");
        res.writeHead(200,{"Content-Type":data.type});
        res.end(data.file);
    })
});
ht.post('/upload',function(req,res){
    console.log("更新用户");
    let form = new formidable.IncomingForm();
    form.uploadDir='tmp/';
    form.type=true;
    let cookie=parseCookie(req);
    let query=req.pathQuery;
    form.parse(req,function(err,fields,files){
        if(err){
            console.log(err);
            return res.err(err);
        }
        let fileName,filePath,Ctype;
        if(files.file){
            fileName=files.file.name;
            filePath=files.file.path;
            Ctype=files.file.type;
        }
        let cookie=parseCookie(req);
        if(!cookie.token||!cookie.id){
            return res.err({
                describe:"错误,无法获取cookie数据",
                errCode:"110",
                error:"失败"
            })
        }
        let obj={
            token:cookie.token,
            pid:cookie.id,
            type:Ctype||null,
            path:filePath||null,
        };
        console.log(fields);
        if(fields.name){
            obj.user_name=fields.name;
        }
        if(fields.brief){
            obj.brief=fields.brief;
        }
        if(fields.birthday){
            obj.birthday=fields.birthday;
        }
        user_db.update(obj,function(err,data){
            if(err){
                console.log(err);
                return res.err(err);
            }
            res.end("ok");
        })
        //console.log(`name:${fileName}\npath:${filePath}\ntype:${Ctype}`);

    })
});

ht.get('/car',function(req,res){
    let query=req.Pquery;
    let cookie=ht.parseCookie(req);
    if(!query.pid||!cookie.token){
        return res.end('error:this query must have pid and cookie must have token value')
    }
    user_db.describe({
        pid:query.pid,
        token:cookie.token,
    },function(err,result){
        if(err){
            return res.err(err);
        }
        res.art('/user/car.html',{
            user:{
                pid:result.pid,
                token:result.token,
                money:result.money||0,
                name:result.name||"无法获取用户名",
                payNum:result.payNum||0,
                brief:result.brief,
                notice_msg:result.notice_msg||result.brief||"天猫双十一"
            }
        },art.render);
    });
});
ht.get('/add_car',function(req,res){
    let query=req.Pquery;
    let cookie=ht.parseCookie(req);
    if(!query.pid||!query.gid||!query.num){
        return res.err({
            error:'招租',
            describe:"该请求必须要有pid和gid以及商品数量",
            errCode:999,
        })
    }
    if(!cookie.token){
        return res.err({
            error:'招租',
            describe:"无token口令",
            errCode:999,
        })
    }
    user_db.find_token('token',cookie.token,function(err,result){
        if(err){
            return res.err(err);
        }
        if(!result){
            return res.err({
                error:"招租",
                describe:"token口令过期",
                errCode:404
            })
        }
        let promise=new Promise((resolve,reject)=>{
            goods.find_goods_one(query.gid,function(err,result){
                if(err){
                    return reject({
                        error:"失败",
                        describe:"可能是服务器错误",
                        errCode:500,
                    })
                }
                if(!result){
                    return reject({
                        describe:"商品不存在!",
                        errCode:404
                    })
                }
                resolve(result)
            })
        });
        promise.then((_result)=>{
            console.log(_result);
            let obj={
                pid:query.pid,
                gid:query.gid,
                num:query.num,
                add_sell:_result.sell_price
            };

            user_db.add_car(obj,function(err,result){
                if(err){
                    return res.err(err);
                }
                res.json({
                    code:200,
                    describe:"添加成功",
                })
            })
        },(err)=>{
            res.err(err);
        });
    })
});

ht.get('/carlist',function(req,res){
    let query=req.Pquery;
    let cookie=ht.parseCookie(req);
    if(!query.pid){
        return res.err({
            error:"缺失数据",
            describe:"must have user pid",
            errCode:"999"
         })
    }
    if(!cookie.token){
        return res.err({
            error:"招租",
            describe:"用户的token口令缺失",
            errCode:"999"
        })
    }
    let page_num=1;
    let limit=50;
    if(query.pageNum){
        page_num=parseInt(query.pageNum);
    }
    if(query.limit){
        limit=parseInt(query.limit);
    }
    let skip=(page_num-1)*limit;

    let promise=new Promise((resolve,reject)=>{
        user_db.user_car(query.pid,skip,limit+1,function(err,results){
            if(err){
                return reject(err);
            }
            resolve(results)
        })
    });
    promise.then((values)=>{
        let gidarr=[];
        for(var i=0;i<values.length;i++){
            gidarr.push(values[i].gid);
        }
        console.log(gidarr);
        goods.find_all(gidarr,function(err,results){
            if(err){
                return res.err(err);
            }
            let list=[];
            //当前价格,
            //当前名称,
            for(let i=0;i<results.length;i++){
                 let index=find(values,results[i].gid);
                 console.log(results[i].gid);
                 if(values[index]){
                     list[i]={
                         gid:values[index].gid,
                         pid:values[index].pid,
                         name:results[i].name,
                         add_sell:values[index].add_sell,
                         now_sell:results[i].sell_price,
                         date:values[index].date,
                         num:values[index].num,
                         check:values[index].check,
                         state:results[i].state
                     };
                     list[i]=JSON.stringify(list[i]);
                 }
            }
            list=list.join('|*-*|');
            res.end(list);
            function find(arr,gid){
                var index=0;

                for(index;index<arr.length;index++){
                    if(arr[index].gid===gid){
                        console.log(index);
                        break;
                    }
                }
                return index;
            }
        })
    },(err)=>{
        res.err(err);
    })
});

ht.get('/change_car',function(req,res){
    let query=req.Pquery;
    let cookie=ht.parseCookie(req);
    if(!query.pid||!query.gid){
        return res.err({
            describe:"删除购物车必须要有对应的用户与商品的id",
            errCode:"999"
        })
    }
    if(!cookie.token){
        return res.err({
            error:"招租",
            describe:"用户未登录无权限进行此操作",
            errCode:"999"
        })
    }
    user_db.find_token({
        pid:query.pid,
        token:cookie.token,
    },function(err,testing){
        if(err){
            return res.err(err);
        }
        if(!testing){
            return res.err({
                errCode:404,
                describe:"用户口令匹配失败,拒绝操作"
            })
        }
        let obj={};
        if(query.num){
            obj.num=query.num;
        }
        if(query.check){
            obj.check=query.check;
        }
        user_db.change_car({
            pid:query.pid,
            gid:query.gid,
        },obj,function(err,result){
            if(err){
                console.log(err);
                return res.err(err);
            }
            res.json(result);
        })
    })
});
ht.get('/del_car',function(req,res){
    let query=req.Pquery;
    let cookie=ht.parseCookie(req);
    if(!query.pid||!query.gid){
        return res.err({
            error:"招租",
            describe:"数据缺失,拒绝删除",
            errCode:"999"
        })
    }
    if(!cookie.token){
        return res.err({
            error:"招租",
            describe:"用户未登录无权限进行此操作",
            errCode:"999"
        })
    }
    user_db.find_token({
        pid:query.pid,
        token:cookie.token,
    },function(err,testing){
        if(err){
            return res.err(err);
        }
        if(!testing){
           return res.err({
               errCode:404,
               describe:"用户口令匹配失败,拒绝操作"
           })
        }
        user_db.del_car(query.pid,query.gid,function(err,result){
            if(err){
                return res.err(err);
            }
            res.json(result)
        })
    })
});

function parseCookie(req){
    let Cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function( Cookie ) {
        var parts = Cookie.split('=');
        Cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
    });
    return Cookies;
}
function parseBody(req,callback){
    let body=[];
    let size=0;
    req.on("data",function(chunk){
        body.push(chunk);
        size+=chunk.length;
    });
    req.on("end",function(){
        body=Buffer.concat(body,size).toString();
        callback(body)
    })
}

function isJSON(str) {
    if (typeof str == 'string') {
        try {
            var obj=JSON.parse(str);
            if(str.indexOf('{')>-1){
                return true;
            }else{
                return false;
            }

        } catch(e) {
            console.log(e);
            return false;
        }
    }
    return false;
}