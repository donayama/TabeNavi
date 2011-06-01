// shoplist.js
var win = Titanium.UI.currentWindow;

Titanium.include('tabelogapi.js');

// ShopListオブジェクトとして諸機能を定義します。
var ShopList = {};
(function () {
	//--------------------------------------
	// ロジック部分
	//--------------------------------------
	// リクエストデータ取得
	ShopList.lastReuestParams = {};
	// xml2json
	ShopList.xml2json = function(xmlAsString) {
		// 返すJSONの雛形
		var answer = {
			Error: false,
			ErrorMessage: null,
			RestaurantInfo: {
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
				answer.RestaurantInfo.NumOfResult = eleNumOfResult.item(0).text;
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
					answer.RestaurantInfo.Item.push(item);
				}
			}
		}
		return answer;
	};
	ShopList.getJSON = function(params, successFunc, errorFunc) {
		// パラメータを保存
		ShopList.lastReuestParams = params;
		// XMLデータ用変数
		var responseText = "";
		// デバッグモード
		if(tabelog_debug) {
			// testdata.xmlを開き、中のデータを取得する。
			var xmlFile = Ti.Filesystem.getFile(Titanium.Filesystem.resourcesDirectory, 'testdata1.xml');
			responseText = xmlFile.read().text;
			successFunc(ShopList.xml2json(responseText));
			xmlFile = null;
		} else {
			// 通常のケース
			var apiUrl = 'http://api.tabelog.com/Ver2.1/RestaurantSearch/';
			var client = Titanium.Network.createHTTPClient();
			client.onload = function() {
				if(client.status == 200) {
					successFunc(ShopList.xml2json(client.responseText));
				} else {
					var json = ShopList.xml2json(client.responseText);
					if(json.Error) {
						errorFunc(json.ErrorMessage);
					}
				}
			};
			client.onerror = function() {
				errorFunc("エラーが発生しました。" + client.status + client.responseText);
			};
			var keyIndex = 0;
			for(var key in params) {
				if(keyIndex == 0) {
					apiUrl += '?'
				} else {
					apiUrl += '&'
				}
				keyIndex++;
				apiUrl += key + '=' + params[key];
			}
			client.open('GET',apiUrl);
			client.send();
		}
	};
	// 店舗情報表示
	ShopList.showShopData = function(item) {
		var winShopData = Titanium.UI.createWindow({
			title: '店舗情報',
			backgroundColor:'#fff',
			url:'shopdata.js',
			shopData: item,
			owner: 'shoplist'
		});
		Titanium.UI.currentTab.open(winShopData, {
			animated:true
		})
	};
	// 検索条件設定表示
	ShopList.showCondition = function() {
		ShopList.searchBar.top = 0;
		ShopList.tableView.top = 40;
	};
	ShopList.hideCondition = function() {
		ShopList.searchBar.top = -40;
		ShopList.tableView.top = 0;
	};
	ShopList.toggleCondition = function() {
		if(ShopList.searchBar.top < 0) {
			ShopList.showCondition();
		} else {
			ShopList.hideCondition();
		}
	};
	//--------------------------------------
	// UI部分
	//--------------------------------------
	// 最寄り駅検索用SearchBar
	ShopList.searchBar = Ti.UI.createSearchBar({
		top:-40,
		height:40,
		hintText: '検索対象の最寄駅を入力',
		showCancel: true
	});
	// 表示対象のTableView
	ShopList.tableView = Ti.UI.createTableView({
		top:0,
		bottom:0
	});
	// ベースとなるTableViewRowを作成する
	ShopList.createTableViewRow = function() {
		var row = Titanium.UI.createTableViewRow();
		row.height = 100;
		row.hasDetail = true;
		row.className = 'datarow';
		return row;
	};
	// ラベルの作成を行う
	ShopList.createLabel = function(text, top, left, height, width, font) {
		var label = Titanium.UI.createLabel({
			text:   text,
			top:    top,
			left:   left,
			width:  width,
			height: height,
			color:  '#000'
		});
		if(font) {
			label.font = font;
		}
		return label;
	};
	// TableViewRowの構築
	ShopList.buildTableViewRow = function(item) {
		var row = ShopList.createTableViewRow();
		var w   = ShopList.tableView.width;
		row.add(ShopList.createLabel(item.RestaurantName, 8, 8, 16, w - 16, null));
		row.add(ShopList.createLabel(item.TotalScore, 40, 8, 'auto', 72, {
			fontFamily : 'DBLCDTempBlack',
			fontSize: 32
		}));
		row.add(ShopList.createLabel(item.Category, 28, 84, 16, w - (84 + 8), {
			fontSize: 12
		}));
		row.add(ShopList.createLabel(item.Station, 44, 84, 16, w - (84 + 8), {
			fontSize: 12
		}));
		if(item.LunchPrice) {
			row.add(ShopList.createLabel('昼：' + item.LunchPrice, 60, 84, 16, w - (84 + 8), {
				fontSize: 12
			}));
		}
		if(item.DinnerPrice) {
			row.add(ShopList.createLabel('夜：' + item.DinnerPrice, 76, 84, 16, w - (84 + 8), {
				fontSize: 12
			}));
		}
		// 行選択時にはショップデータウィンドウを表示する。
		row.addEventListener('click', function() {
			ShopList.showShopData(item);
		});
		return row;
	};
	// TableViewのデータ構築を行う。
	ShopList.buildTableView = function(json, clear) {
		// エラーの時はなにもしない
		if(!json || !json.RestaurantInfo || json.Error) {
			return;
		}
		if(clear) {
			// 一旦中身をクリアする
			ShopList.tableView.data = [];
		}
		// 全データ件数
		var numOfResult = json.RestaurantInfo.NumOfResult;
		// 取得したデータを並べる
		for(var i = 0; i < json.RestaurantInfo.Item.length; i++) {
			ShopList.tableView.appendRow(
			ShopList.buildTableViewRow(json.RestaurantInfo.Item[i])
			);
		}
		// 今のページ番号よりも検索結果が多い場合は「もっと読む」を表示する
		if((ShopList.lastReuestParams.PageNum * 20) < numOfResult) {
			var row = ShopList.createTableViewRow();
			var label = ShopList.createLabel('もっと読む', 8, 8, 84, ShopList.tableView.width - 16, null);
			row.add(label);
			// 押すと追加読み込みをして、もっと読むを削除
			row.addEventListener('click', function(e) {
				label.text = 'ただいま読み込み中・・・';
				var newParams = ShopList.lastReuestParams;
				newParams.PageNum += 1;
				// データ取得し、TableViewとして表示する。
				ShopList.getJSON(
				newParams, function(json) {
					// クリアせずに追記する
					ShopList.buildTableView(json, false);
				}, function(message) {
					alert(message);
				}
				);
				ShopList.tableView.deleteRow(e.index);
			});
			ShopList.tableView.appendRow(row);
		}
	};
})();
var loadShopList = function() {
	// 検索条件を隠す
	ShopList.hideCondition();
	var params = {
		// APIアクセスキー
		Key : tabelog_apiaccesskey,
		// 検索範囲の広さ
		SearchRange:'medium',
		// 結果データの内容
		ResultSet:  'large',
		// ソート順
		SortOrder:'totalscore',
		// 取得データのページ番号
		PageNum: 1
	};
	if(ShopList.searchBar.value) {
		// 最寄り駅を設定
		params.Station = ShopList.searchBar.value;
		// データ取得し、TableViewとして表示する。
		ShopList.getJSON(
		params, function(json) {
			// クリアして新たに表示する。
			ShopList.buildTableView(json, true);
		}, function(message) {
			alert(message);
		}
		);
	} else {
		// 位置測定機能の有効状態を取得するプロパティ
		if(Titanium.Geolocation.locationServicesEnabled) {
			// 位置測定機能が必要な処理
			Titanium.Geolocation.getCurrentPosition( function(e) {
				// エラー時はコールバック関数の引数のerrorプロパティがセットされます
				if (!e.success || e.error) {
					alert('error ' + JSON.stringify(e.error));
					// 緯度・経度・測地系
					params.Latitude  = 35.68128;
					params.Longitude = 139.76165;
					params.Datum     = 'world';
					// データ取得し、TableViewとして表示する。
					ShopList.getJSON(
					params, function(json) {
						// クリアして新たに表示する。
						ShopList.buildTableView(json, true);
					}, function(message) {
						alert(message);
					}
					);
					return;
				}
				// 緯度・経度・測地系
				params.Latitude  = e.coords.latitude;
				params.Longitude = e.coords.longitude;
				params.Datum     = 'world';
				// 状態取得時の処理
				// データ取得し、TableViewとして表示する。
				ShopList.getJSON(
				params, function(json) {
					// クリアして新たに表示する。
					ShopList.buildTableView(json, true);
				}, function(message) {
					alert(message);
				}
				);
				return;
			});
		} else {
			tabelog_debug = false;
			// データ取得し、TableViewとして表示する。
			ShopList.getJSON(
			params, function(json) {
				// クリアして新たに表示する。
				ShopList.buildTableView(json, true);
			}, function(message) {
				alert(message);
			}
			);

			return;
		}
	}
};
// 位置情報の再読込処理
if(Titanium.Platform.osname === 'android') {
	// Android
	var activity = Titanium.Android.currentActivity;
	if(activity) {
		activity.onCreateOptionsMenu = function(e) {
			var menu = e.menu;
			var menuItem = menu.add({
				title: "再読込"
			});
			menuItem.setIcon("dark_refresh.png");
			menuItem.addEventListener("click", function(e) {
				loadShopList();
			});
		};
	}
} else {
	// iOS
	win.leftNavButton = (function() {
		var refreshButton = Titanium.UI.createButton({
			systemButton:Titanium.UI.iPhone.SystemButton.REFRESH
		});
		refreshButton.addEventListener('click', function() {
			loadShopList();
		});
		return refreshButton;
	})();
}
win.add(ShopList.tableView);

ShopList.tableView.data = [{
	title: '食べナビ'
}
];
loadShopList();