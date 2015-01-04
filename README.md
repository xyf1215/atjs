at.js
====

调用示例
HTML:
<link href="/common/at/css/at.css" rel="stylesheet" type="text/css" />
<script src="/common/at/js/at.js"></script>

<div class="at-container"></div>

JS:
$(".at-container").at({
	"@" : {
		"title" : "选择最近@的人或直接输入",
 		"sync" : true,
 		"txn" : "/txnDiscussionUserList.ajax"
 	},
 	"#" : {
 		"url" : "",
 		"data" : [12, 23, 34]
 	}
});
