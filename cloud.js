const AV = require("leanengine");
const mail = require("./utilities/send-mail");
const Comment = AV.Object.extend("Comment");
const axios = require("axios");
const spam = require("./utilities/check-spam");

function sendNotification(currentComment, defaultIp) {
  // 发送博主通知邮件
  if (currentComment.get("mail") !== process.env.TO_EMAIL) {
    mail.notice(currentComment);
  }

  const ip = currentComment.get("ip") || defaultIp;
  console.log("IP: %s", ip);
  spam.checkSpam(currentComment, ip);

  // AT评论通知
  const rid = currentComment.get("pid") || currentComment.get("rid");

  if (!rid) {
    console.log("这条评论没有 @ 任何人");
    return;
  } else if (currentComment.get("isSpam")) {
    console.log("评论未通过审核，通知邮件暂不发送");
    return;
  }

  const query = new AV.Query("Comment");
  query.get(rid).then(
    function (parentComment) {
      if (
        parentComment.get("mail") &&
        parentComment.get("mail") !== process.env.TO_EMAIL
      ) {
        mail.send(currentComment, parentComment);
      } else {
        console.log("被@者匿名，不会发送通知");
      }
    },
    function (error) {
      console.warn("获取@对象失败！");
    }
  );
}

AV.Cloud.afterSave("Comment", function (req) {
  const currentComment = req.object;
  // 检查垃圾评论
  return sendNotification(currentComment, req.meta.remoteAddress);
});


