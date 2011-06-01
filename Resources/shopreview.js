var win = Titanium.UI.currentWindow;

Titanium.include('tabelogapi.js');

// 引き継ぎデータ
var item = win.shopData;

// ShopReviewオブジェクトとして諸機能を定義します。
var ShopReview = {};
(function () {
	//--------------------------------------
	// ロジック部分
	//--------------------------------------
	// リクエストデータ取得
	ShopReview.lastReuestParams = {};
	// xml2json
	ShopReview.xml2json = function(xmlAsString) {
		// ReviewImageSearchにあわせて修正
		// 返すJSONの雛形
		var answer = {
			Error: false,
			ErrorMessage: null,
			ReviewInfo: {
				NumOfResult: 0,
				Item:[]
			}
		};
		var xml = Ti.XML.parseString(xmlAsString);
		// エラーの存在確認
		var eleError = xml.documentElement.getElementsByTagName("Error");
		if(eleError != null && eleError.length == 1) {
			answer.Error = true;
			switch(eleError.firstChild.text) {
				case 'ItemNotFound':
					answer.ErrorMessage = '条件に該当するデータがありません。';
					break;
				case 'AccessLimitExceeded':
					answer.ErrorMessage = '本日はアクセスできません。';
					break;
				// case...略
				default:
					answer.ErrorMessage = eleError.firstChild.text;
					break;
			}
		} else {
			var eleNumOfResult = xml.documentElement.getElementsByTagName("NumOfResult");
			if(eleNumOfResult != null && eleNumOfResult.length == 1) {
				answer.ReviewInfo.NumOfResult = eleNumOfResult.item(0).text;
			}
			var eleItems = xml.documentElement.getElementsByTagName("Item");
			if(eleItems != null && eleItems.length > 0) {
				for(var i = 0; i < eleItems.length; i++) {
					var eleItem = eleItems.item(i);
					// 要素のタグをキーにしたハッシュを構築し、Itemとする
					var item = {};
					for(var j = 0; j < eleItem.childNodes.length; j++) {
						item[eleItem.childNodes.item(j).nodeName] = eleItem.childNodes.item(j).text;
					}
					answer.ReviewInfo.Item.push(item);
				}
			}
		}
		return answer;
	};
	// リクエストデータ取得
	ShopReview.getJSON = function(params, successFunc, errorFunc) {
		// パラメータを保存
		ShopReview.lastReuestParams = params;
		
		if(tabelog_debug) {
			// testdata_review.xmlを開き、中のデータを取得する。
			var xmlFile = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, 'testdata_review.xml');
			var responseText = xmlFile.read().getText();
			successFunc(ShopReview.xml2json(responseText));
			xmlFile = null;
		} else {
			// 通常のケース
			var apiUrl = 'http://api.tabelog.com/Ver1/ReviewSearch/';
			var client = Titanium.Network.createHTTPClient();
			client.onload = function() {
				if(client.status == 200) {
					successFunc(ShopReview.xml2json(client.responseText));
				} else {
					var json = ShopReview.xml2json(client.responseText);
					if(json.Error) {
						errorFunc(json.ErrorMessage);
					}
				}
			};
			client.onerror = function() {
				errorFunc("エラーが発生しました。" + client.status + client.responseText);
			};
			client.open('GET', apiUrl);
			client.send(params);
		}
	};
	//--------------------------------------
	// UI部分
	//--------------------------------------
	// 表示対象のTableView
	ShopReview.tableView = Ti.UI.createTableView({
		top:0,
		bottom:0
	});
	// ベースとなるTableViewRowを作成する
	ShopReview.createTableViewRow = function() {
		var row = Titanium.UI.createTableViewRow();
		row.height = 150;
		return row;
	};
	// ラベルの作成を行う
	ShopReview.createLabel = function(text, top, left, height, width, font) {
		var label = Titanium.UI.createLabel({
			text:   text,
			top:    top,
			left:   left,
			width:  width,
			height: height,
			color:  '#000'
		});
		label.ellipsize = true;
		if(font) {
			label.font = font;
		}
		return label;
	};
	// TableViewRowの構築
	ShopReview.buildTableViewRow = function(item) {
		var row = ShopReview.createTableViewRow();
		var w   = ShopReview.tableView.width;
		if(w == 0){
			w = Titanium.Platform.displayCaps.platformWidth;
		}
		row.add(ShopReview.createLabel(item.NickName, 8, 8, 16, w - 16, null));
		row.add(ShopReview.createLabel(item.TotalScore, 40, 8, 'auto', 72, {
			fontFamily : 'DBLCDTempBlack',
			fontSize: 24
		}));
		row.add(ShopReview.createLabel(item.Situation, 28, 84, 16, w - (84 + 8), {
			fontSize: 10
		}));
		row.add(ShopReview.createLabel(item.ReviewDate, 40, 84, 16, w - (84 + 8), {
			fontSize: 10
		}));
		row.add(ShopReview.createLabel(item.Comment, 72, 4, row.height - (72 + 4) , w - 8, {
			fontSize: 10
		}));
		return row;
	};
	// TableViewのデータ構築を行う。
	ShopReview.buildTableView = function(json, clear) {
		// エラーの時はなにもしない
		if(!json || !json.ReviewInfo || json.Error) {
			return;
		}
		if(clear) {
			// 一旦中身をクリアする
			ShopReview.tableView.data = [];
		}
		// 全データ件数
		var numOfResult = json.ReviewInfo.NumOfResult;
		// 取得したデータを並べる
		for(var i = 0; i < json.ReviewInfo.Item.length; i++) {
			ShopReview.tableView.appendRow(
			ShopReview.buildTableViewRow(json.ReviewInfo.Item[i])
			);
		}
		// 今のページ番号よりも検索結果が多い場合は「もっと読む」を表示する
		if((ShopReview.lastReuestParams.PageNum * 20) < numOfResult) {
			var row = ShopReview.createTableViewRow();
			var label = ShopReview.createLabel('もっと読む', 8, 8, 84, ShopReview.tableView.width - 16, null);
			row.add(label);
			// 押すと追加読み込みをして、もっと読むを削除
			row.addEventListener('click', function(e) {
				label.text = 'ただいま読み込み中・・・';
				var newParams = ShopReview.lastReuestParams;
				newParams.PageNum += 1;
				// データ取得し、TableViewとして表示する。
				ShopReview.getJSON(
				newParams, function(json) {
					// クリアせずに追記する
					ShopReview.buildTableView(json, false);
				}, function(message) {
					alert(message);
				}
				);
				ShopReview.tableView.deleteRow(e.index);
			});
			ShopReview.tableView.appendRow(row);
		}
	};
})();
var loadShopReviewList = function() {
	// データ取得し、CoverFlowViewとして表示する。
	ShopReview.getJSON({
		// APIアクセスキー
		Key : tabelog_apiaccesskey,
		// レストランコード
		Rcd : item.Rcd,
		// 取得データのページ番号
		PageNum: 1,
		// 並べ替え順
		SortOrder: 'update'
	}, function(json) {
		ShopReview.buildTableView(json, true);
	}, function(error) {
		alert(error);
	}
	);
};
win.add(ShopReview.tableView);
loadShopReviewList();
