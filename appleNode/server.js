const express = require('express');
const app = express();
// 포트란 컴퓨터에 6만개정도의 구멍이있다 그 구멍을 포트라고한다.
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(express.urlencoded({extended: true})) 
// post요청을 처리하고싶다면 bodyparser라이브러리가 필수이다.

const MongoClient = require('mongodb').MongoClient;

app.use('/public',express.static('public'))

// env파일을 읽기위한 라이브러리
require('dotenv').config()

app.set('view engine','ejs');

// form태그에서 put과 delete가능하게 만들어준다.
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

// 로그인페이지만들기 아이디 비번 검사
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 

const url = process.env.DB_URL

// 사진 업로드
let multer = require('multer')
var storage = multer.diskStorage({
  destination : function(req,file,cd){
    cd(null,'./public/image')
  },
  filename : function(req,file,cd){
    cd(null, file.originalname)
  }
});
var upload = multer({storage : storage});

app.get('/upload',(req,res)=>{
  res.render('upload.ejs')
})

app.post('/upload', upload.single('profile'), function(요청, 응답){
  응답.send('업로드완료')
}); 

app.get('/image/:img',(req,res)=>{
  res.sendFile(__dirname+'/public/image/'+req.params.img)
})
// <img src = "/image/dizin.jpg">
// 사진 업로드 end

var db;
MongoClient.connect(url ,{ useUnifiedTopology: true },function(err, client){
  if (err) return console.log(err);
  db = client.db('todoapp')

  app.listen(process.env.PORT, function(){
    console.log('listening on 8080')
  });
})


app.get('/',function(req,res){
  res.render('index.ejs')
});
app.get('/write' ,function(req,res){
  res.render('write.ejs')
})




app.get('/list',(req,res)=>{
  db.collection('post').find().toArray((err,result)=>{
    console.log(res);
    res.render('list.ejs',{posts:result})
  });
}) 


// : 은 detail/{id} 와 같다 
app.get('/detail/:id',(req,res)=>{
  db.collection('post').findOne({_id: parseInt(req.params.id)},(err,result)=>{
    console.log(result)
    res.render('detail.ejs',{data : result})
  })
})

app.get('/edit/:id',(req,res)=>{
  db.collection('post').findOne({_id: parseInt(req.params.id)},(err,result)=>{
    console.log(result)
    res.render('edit.ejs',{post:result})
  })
})

app.put('/edit',(req,res)=>{
  db.collection('post').updateOne({_id : parseInt(req.body.id)},{$set : {제목:req.body.title,날짜:req.body.date}},(err,result)=>{
    console.log('수정완료')
    res.redirect('/list')
  })
})

app.get('/login',(req,res)=>{
  res.render('login.ejs')
})

app.post('/login', passport.authenticate('local',{
  failureRedirect : '/fail'  // 로그인실패시 fail로 이동시킴
}) ,(req,res)=>{
  res.redirect('/')
})


// 미들웨어에 로그인확인 함수를 넣어 로그인되어있는지 확인
app.get('/mypage',loginCheck,(req,res)=>{
  console.log(req.user)
  res.render('mypage.ejs',{사용자 : req.user})
})

// 로그인 확인 함수
function loginCheck(req, res,next){
  if(req.user){
    next() // 로그인이 되어있다면 next로 통과
  }else {
    res.send('로그인먼저 하셔야합니다.')
  }
}


passport.use(new LocalStrategy({
  usernameField: 'id', // form에 적힌 name
  passwordField: 'pw', // form에 적힌 name
  session: true, // 세션에 저장 여부
  passReqToCallback: false, // 아이디/비번 말고 다른 정보도 검증하고싶을시 true
}, function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    if (에러) return done(에러) // db자체 오류

    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
    // 아이디로 결과가 없을때
    
    if (입력한비번 == 결과.pw) {
      return done(null, 결과)
      // 비밀번호가 일치하면 로그인 시켜주기
    } else {
      return done(null, false, { message: '비번틀렸어요' })
      // 비밀번호가 불일치하면 가운데 false로 로그인 실패
    }
  })
}));
// 보안이 쓰래기다 암호화가 되지 않았음

// 로그인 성공시 세션에 저장( 쿠키 )
// 위에서 로그인 성공하면 결과가 알아서 들어오게 된다.
passport.serializeUser((user,done)=>{
  done(null,user.id)
})

// 이 세션데이터를 가진사람을 db에서 찾아주세요(마이페이지 같은데서 발동)
passport.deserializeUser((loginId,done)=>{
  db.collection('login').findOne({id:loginId},(err,result)=>{
    done(null,result)
  })
})




// 검색
app.get('/search', (요청, 응답)=>{

  var 검색조건 = {
    '제목' : {$regex : 요청.query.value , $options:'i'}
  }
  
  console.log(요청.query);
  db.collection('post').find(검색조건).toArray((에러, 결과)=>{
    console.log(결과)
    응답.render('search.ejs', {posts : 결과})
  })
})

// 회원가입
app.post('/register',(req,res)=>{
  db.collection('login').findOne({id:req.body.id},(err,result)=>{
    if(!result){
      db.collection('login').insertOne({id:req.body.id, pw:req.body.pw})
      res.render('login.ejs')
    }else{
      res.render('login.ejs')
    }
  })
})

// 게시물 수정
app.post('/edit',(req,res)=>{
  
  res.send('전송완료')
  const eq = req.body
  // counter 의 게시물갯수를 찾음
  db.collection('counter').findOne({name:'게시물갯수'},(err,result)=>{
    var totalPost = result.totalPost // 게시물갯수를 변수에 저장
    
                // 게시물을 추가해주고 idx도 전체갯수 +1이된다.
    db.collection('post').insertOne(저장할거 ,function(err,res){
      console.log('저장완료')
      db.collection('counter').updateOne({name:'게시물갯수'},{ $inc : {totalPost : 1}},(err,result)=>{
        if(err){ return console.log(err)}
      })
      // 완료가되면 게시물갯수가 + 1이된다.
    });

    

  })
  // req에 저장된 데이터가 있게된다.
})

// post요청을 받음
app.post('/add',(req,res)=>{
  res.send('전송완료')
  const eq = req.body
  // counter 의 게시물갯수를 찾음
  db.collection('counter').findOne({name:'게시물갯수'},(err,result)=>{
    const totalPost = result.totalPost // 게시물갯수를 변수에 저장
    var 저장할거 = {_id: totalPost +1 ,제목 : eq.title, 날짜 : eq.date, 작성자:eq._id, 작성자 : req.user._id} 
                // 게시물을 추가해주고 idx도 전체갯수 +1이된다.
    db.collection('post').insertOne(저장할거,function(err,res){
      console.log('저장완료')
      db.collection('counter').updateOne({name:'게시물갯수'},{ $inc : {totalPost : 1}},(err,result)=>{
        if(err){ return console.log(err)}
      })
      // 완료가되면 게시물갯수가 + 1이된다.
    });

  
  })
  // req에 저장된 데이터가 있게된다.
})

// 자바신문법 에로우펑션 위와같은효과지만 function대신 => {}형식으로 만들어준다.
// app.get('/write',(req,res)=>{
//   res.sendFile(__dirname+'/write.html')
// })


app.delete('/delete/:id',(req,res)=>{

  var 삭제할데이터 = {_id : req.body._id, 작성자 : req.user._id}

  db.collection('post').deleteOne(parseInt(req.params.id),(err,result)=>{
    console.log('삭제완료');
    if(err) {console.log(err)}
    res.status(200).send({message : '성공했습니다'})
  })
  
})

// use는 전역으로 사용하고싶을때 use를 사용하고
// 하나의 함수에만 적용하고 싶다면 미들웨어를 적용한다.
app.use('/shop',require('./routes/shop.js'))
// . 은 현재 경로라는 뜻

app.use('/board/sub',require('./routes/category.js'))

// ObjectId로 묶기위한 require
const {ObjectId } = require('mongodb')

app.post('/chatroom',loginCheck,(req,res)=>{

  var 저장할거 ={
    title : '무슨채팅방',
    // post에서 받아온 chatfol과 세션에 저장되어있던 user의 id를 가져옴
    member : [ObjectId(req.body.chatfol),req.user._id],
    date : new Date()
  }

  db.collection('chatroom').insertOne(저장할거).then((result)=>{

  })
})

app.get('/chat',loginCheck,(req,res)=>{

  db.collection('chatroom').find({member : req.user._id}).toArray().then((result)=>{
    res.render('chat.ejs',{data : result}) 
    
  })

})

// 디비에 저장하는 요청
app.post('/message',loginCheck,(req,res)=>{
  var 저장할거 ={
    parent : req.body.parent,
    content: req.body.content,
    // parent와 content는 post로 받은 데이터
    
    userid:req.user._id,
    // 세션에 저장된 user의 id를 가져옴
    date : new Date(),
    // 내장 기능인 Date를 사용하여 오늘날짜 가져옴
  }

  db.collection('message').insertOne(저장할거)
  .then((result)=>{
    res.send(result)
  })
})

app.get('/message/:id',loginCheck,(req,res)=>{
  res.writeHead(200,{
    "Connection" : "keep-alive", // 지속적인 응답 설정
    "Content-Type" : "text/event-stream",
    "Cache-Control" : "no-cache",
  })

  db.collection('message').find({parent : req.params.id}).toArray()
  .then((result)=>{
    res.write('event:test\n')
    res.write('data:'+ JSON.stringify(result) +' \n\n')
  })

  // 채팅 생성시 업데이트를 위해서 선택된 채팅방의 id를 입력
  const pipeline = [
    {$match:{'fullDocument.parent': req.params.id}}
  ]
  const collection = db.collection('message')

  // message의 속성중 채팅방의 번호와 일치하면 가져옴
  const changeStream = collection.watch(pipeline)

  // 위에서 찾아놓은 해당하는 db가 변동되면 res.write를 사용하여 최신화시켜주기
  changeStream.on('change',(result)=>{
    res.write('event:test\n')
    res.write('data:'+ JSON.stringify([result.fullDocument])+'\n\n')
  })

})