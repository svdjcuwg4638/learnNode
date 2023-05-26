var router = require('express').Router()

function loginCheck(req, res,next){
  if(req.user){
    next() // 로그인이 되어있다면 next로 통과
  }else {
    res.send('로그인먼저 하셔야합니다.')
  }
}



// router.use(loginCheck);
// 모든 라우터에 미들웨어가 적용된다.

router.use('/shirts',loginCheck);
// shirts페이지에만 로그인확인

router.get('/shirts',(req,res)=>{
  res.send('셔츠 파는 페이지입니다.')
})

router.get('/pants',(req,res)=>{
  res.send('바지 파는 페이지입니다.')
})

module.exports = router
// 이파일에서 이변수를 배출하겠습니다라는 뜻임