var win = Titanium.UI.currentWindow;

Titanium.include('tabelogapi.js');

// 引き継ぎデータ
var item = win.shopData;

// ShopPhotoオブジェクトとして諸機能を定義します。
var ShopPhoto = {};
(function () {
	//--------------------------------------
	// ロジック部分
	//--------------------------------------
	// xml2json
	ShopPhoto.xml2json = function(xmlAsString) {
		// ReviewImageSearchにあわせて修正
		// 返すJSONの雛形
		var answer = {
			Error: false,
			ErrorMessage: null,
			ReviewImageInfo: {
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
			var eleItems = xml.documentElement.getElementsByTagName("Item");
			if(eleItems != null && eleItems.length > 0) {
				for(var i = 0; i < eleItems.length; i++) {
					var eleItem = eleItems.item(i);
					// 要素のタグをキーにしたハッシュを構築し、Itemとする
					var item = {};
					for(var j = 0; j < eleItem.childNodes.length; j++) {
						item[eleItem.childNodes.item(j).nodeName] = eleItem.childNodes.item(j).text;
					}
					answer.ReviewImageInfo.Item.push(item);
					answer.ReviewImageInfo.NumOfResult++;
				}
			}
		}
		return answer;
	};
	// リクエストデータ取得
	ShopPhoto.getJSON = function(params, successFunc, errorFunc) {
		// XMLデータ用変数
		var responseText = "";
		if(tabelog_debug) {
			// testdata_photo.xmlを開き、中のデータを取得する。
			var xmlFile = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, 'testdata_photo.xml');
			responseText = xmlFile.read().getText();
			successFunc(ShopPhoto.xml2json(responseText));
			xmlFile = null;
		} else {
			// 通常のケース
			var apiUrl = 'http://api.tabelog.com/Ver1/ReviewImageSearch/';
			var client = Titanium.Network.createHTTPClient();
			client.onload = function() {
				if(client.status == 200) {
					successFunc(ShopPhoto.xml2json(client.responseText));
				} else {
					var json = ShopPhoto.xml2json(client.responseText);
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
	// 店舗情報表示
	ShopPhoto.showPhoto = function(item) {
		var photoWindow = Titanium.UI.createWindow({
			title: '写真',
			backgroundColor:'#fff',
			url: 'shopdata.js',
		});
		Titanium.UI.currentTab.open(photoWindow, {
			animated:true
		});
	};
	// 結果データ保存
	ShopPhoto.photos = [];
	// CoverFlowViewの表示変更時イベント
	ShopPhoto.change = function(e) {
		var thisPhoto = ShopPhoto.photos[e.index];
		ShopPhoto.commentLabel.text = thisPhoto.ImageComment;
	};
	// CoverFlowViewのクリック時イベント
	ShopPhoto.click = function(e) {
		var thisPhoto = ShopPhoto.photos[e.index];
		var url = thisPhoto.MobileSiteUrl; // thisPhoto.PcSiteUrl;
		// 写真のページを表示する
		var webWindow = Titanium.UI.createWindow({
			title: '写真ページ',
			backgroundColor: '#fff'
		});
		webWindow.add(Titanium.UI.createWebView({
			url: thisPhoto.PcSiteUrl	//url: thisPhoto.MobileSiteUrl
		}));
		Titanium.UI.currentTab.open(webWindow, {
			animated: true
		});
	};
	//--------------------------------------
	// UI部分
	//--------------------------------------
	// 表示対象のCoverFlowView
	ShopPhoto.coverFlowView = Ti.UI.createCoverFlowView({
		top:0,
		height: win.width,
		backgroundColor: '#fff'
	});
	ShopPhoto.commentLabel = Ti.UI.createLabel({
		top: win.width,
		bottom:0,
		left:8,
		right:8,
		text: '',
		textAlign: 'center'
	});
	// CoverFlowViewのデータ構築を行う。
	ShopPhoto.buildCoverFlowView = function(json) {
		// 一旦中身をクリアする
		var images = [];
		ShopPhoto.photos = [];
		ShopPhoto.coverFlowView.removeEventListener('change', ShopPhoto.change);
		ShopPhoto.coverFlowView.removeEventListener('click', ShopPhoto.click);
		// 取得したデータを並べる
		for(var i = 0; i < json.ReviewImageInfo.Item.length; i++) {
			var photoItem = json.ReviewImageInfo.Item[i];
			ShopPhoto.photos.push(photoItem);
			images.push(photoItem.ImageUrlL);
		}
		// 画像切替時イベント
		ShopPhoto.coverFlowView.addEventListener('change', ShopPhoto.change);
		// クリック時イベント
		ShopPhoto.coverFlowView.addEventListener('click', ShopPhoto.click);
		// 取得したデータをセットする
		ShopPhoto.coverFlowView.images = images;
		ShopPhoto.commentLabel.text = ShopPhoto.photos[0].ImageComment;
	};
})();
var loadShopPhoto = function() {
	// データ取得し、CoverFlowViewとして表示する。
	ShopPhoto.getJSON({
		// APIアクセスキー
		Key : tabelog_apiaccesskey,
		// レストランコード
		Rcd : item.Rcd
	}, function(json) {
		ShopPhoto.buildCoverFlowView(json);
	}, function(error) {
		alert(error);
	}
	);
};
win.add(ShopPhoto.coverFlowView);
win.add(ShopPhoto.commentLabel);
loadShopPhoto();
