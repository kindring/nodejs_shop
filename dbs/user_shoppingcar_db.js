const fs=require('fs');
const mongo=require('mongoose');
const  Schema=mongo.Schema;
mongo.connect('mongodb://localhost/itcast', {useNewUrlParser: true});

const carSchema = new Schema({
    gid:{
        type:String,
        required:true,
    },
    pid:{
        type:String,
        required:true,
    },
    date:{
        type:Date,
        required:true,
    },
    num:{
      type:Number,
      required:true,
    },
    check:{
        type:Number,
        default:0,
        required:true,
    },
    add_sell:{
        type:Number,
        required:true,
    }
});

const car = mongo.model('cars',carSchema);

let add = function (json,callback){
    if(!json.pid||!json.gid||!json.add_sell||!json.num){
        return callback({
            error:"数据缺失",
            describe:"添加购物车必须要有gid和pid以及价钱与数量"
        })
    }
    let new_date=new Date();
    let new_car=new car({
        gid:json.gid,
        pid:json.pid,
        num:json.num,
        add_sell:json.add_sell,
        check:json.check,
        date:new_date,
    });
    new_car.save(function(err,result){
        if(err){
            return callback({
                error:err,
                describe:"查询数据时出现错误",
                errCode:"505"
            })
        }
        callback(null,result);
    })
};
//添加购物车测试用例
// add_car({
//     pid:4399,
//     gid:30068,
//     add_sell:1297,
//     num:5,
// },function(err,result){
//     if(err){
//         return console.log(err);
//     }
//     return result;
// });

let find = function (condition,skipNum,limitNum,nartural,callback){
    let query=car.find({});
    if(condition){
        query.where(condition)
    }
    skipNum=skipNum||0;
    limitNum=limitNum||50;//限制一次默认最多获取50条数据
    if(nartural!==null){
        query.sort({$natural:-1});
    }
    query.limit(limitNum);
    query.exec(function(err,docs){
        callback(err,docs);
    })

};
//查找用户测试
// find({pid:72261},0,1000,-1,function(err,result){
//     if(err){
//         console.log(err)
//     }
//     console.log(result)
// });

let change =function(odds,newfiles,callback){
    car.updateOne(odds,newfiles,function(err,result){
        if(err){
            return callback({
                error:err,
                describe:"修改购物车数量出现错误",
                errCode:505
            })
        }
        if(result.n===0){
            return callback({
                error:"匹配失败",
                describe:"修改购物车数量时",
                errCode:'404'
            })
        }
        callback(null,result);
    })
};
let del = function(pid,gid,callback){
    car.deleteOne({
        pid:pid,
        gid:gid,
    },function(err,result){
        if(err){
            return callback(err)
        }
        callback(null,result);
    })
};
// add({
//     num:1,
//     gid:4567,
//     pid:1234,
//     add_sell:1234.5
// },function(err,result){
//     if(err){
//         console.log(err)
//     }
//     console.log(result);
// })
// change(1234,4567,5,function(err,result){
//    if(err){
//        console.log(err);
//    }
//    if(result)
//    console.log(result);
// });

exports.user_find=function(pid,skipNum,limitNum,callback){
    find({pid:pid},skipNum,limitNum,-1,function(err,result){
        if(err){
            return callback(err)
        }
        callback(null,result);
    })
};
exports.goods_find=function(gid,skipNum,limitNum,callback){
    find({gid:gid},skipNum,limitNum,-1,function(err,result){
        if(err){
            return callback(err)
        }
        callback(null,result);
    })
};
exports.add=function(json,callback){
    if(!json.pid||!json.gid||!json.num||!json.add_sell){
        return callback({
            error:"数据缺失",
            describe:"添加购物车时出现异常",
            errCode:"999"
        })
    }
    car.findOne({
        pid:json.pid,
        gid:json.gid
    },function(err,result){
        if(err){
            return callback(err)
        }
        if(!result){
            add({
                pid:json.pid,
                gid:json.gid,
                num:json.num,
                add_sell:json.add_sell,
                check:0
            },function(err,_result){
                callback(err,_result);
            })
        }else{
            let oldNum=parseInt(result.num);
            let nowNum=parseInt(json.num);
            nowNum+=oldNum;
            change({pid:json.pid,gid:json.gid},{
                num:nowNum
            },function(err,_result){
                callback(err,_result)
            });
        }
    })
};
exports.change=change;
exports.del=del;






















