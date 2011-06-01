// favorites.js
var win = Titanium.UI.currentWindow;

// ShopListオブジェクトとして諸機能を定義します。
var ShopList = {};
(function () {
	//--------------------------------------
	// ロジック部分
	//--------------------------------------
	// リクエストデータ取得
	ShopList.getJSON = function(params, successFunc, errorFunc) {
		var json = {
			Error: false,
			RestaurantInfo: {
				NumOfResult : 0,
				Item:[]
			}
		};
		// データベースファイルを開きます（ない場合、作成されます）
		var db = Titanium.Database.open('tabenavi');
		try {
			// FAVORITESテーブルをSELECTします。
			var rows = db.execute('SELECT * FROM FAVORITES ORDER BY UPDATED_ON DESC');
			while(rows.isValidRow()) {
				var thisJSON = rows.fieldByName('JSON');
				json.RestaurantInfo.Item.push(JSON.parse(thisJSON));
				json.RestaurantInfo.NumOfResult++;
				rows.next();
			}
			// 走査が終わったらResultSetを閉じておきます。
			rows.close();
			rows = null;
		} catch(ex) {
			Titanium.API.info(ex);
			errorFunc(ex);
		}
		// 操作が終わったら後片付け
		db.close();
		db = null;
		// 結果を返す
		successFunc(json);
	};
	// 店舗情報表示
	ShopList.showShopData = function(item) {
		var winShopData = Titanium.UI.createWindow({
			title: '店舗情報',
			backgroundColor:'#fff',
			url:'shopdata.js',
			shopData: item,
			owner: 'favorites'
		});
		winShopData.addEventListener('close', function(e){
			loadShopList();
		});
		Titanium.UI.currentTab.open(winShopData, {
			animated:true
		})
	};
	//--------------------------------------
	// UI部分
	//--------------------------------------
	// 表示対象のTableView
	ShopList.tableView = Ti.UI.createTableView({
		top:0,
		bottom:0,
		editable:true,
		deleteButtonTitle:'削除する'
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
			height: height
		});
		if(font) {
			label.font = font;
		}
		return label;
	};
	// TableViewRowの構築
	ShopList.buildTableViewRow = function(item) {
		var row  = ShopList.createTableViewRow();
		var w    = ShopList.tableView.width;
		row.item = item;
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
		// 取得したデータを並べる
		for(var i = 0; i < json.RestaurantInfo.Item.length; i++) {
			ShopList.tableView.appendRow(
			ShopList.buildTableViewRow(json.RestaurantInfo.Item[i])
			);
		}
	};
})();
var loadShopList = function() {
	// 状態取得時の処理
	// データ取得し、TableViewとして表示する。
	ShopList.getJSON({}, function(json) {
		// クリアして新たに表示する。
		ShopList.buildTableView(json, true);
	}, function(message) {
		alert(message);
	}
	);
};
win.add(ShopList.tableView);
ShopList.tableView.data = [{
	title: '食べナビ'
}
];
win.addEventListener('focus', function() {
	loadShopList();
});
// 削除ボタン実行時イベント
ShopList.tableView.addEventListener('delete', function(e) {
	// Rowのitemカスタムプロパティでキーを取得する。
	var rcd = e.rowData.item.Rcd;

	// データベースファイルを開きます。
	var db = Titanium.Database.open('tabenavi');
	try {
		db.execute(
		"DELETE FROM FAVORITES WHERE RCD = ?", rcd
		);
		Titanium.API.info('削除された行数 = ' + db.rowsAffected);
	} catch(ex) {
		Titanium.API.info(ex);
	}
	// 操作が終わったら後片付け
	db.close();
	db = null;

	// データが0件になったときにはダミーデータを表示する
	if(e.section.rowCount == 0) {
		ShopList.tableView.data = [{
			title: 'お気に入りデータがありません。'
		}
		];
	}
});
if(Titanium.Platform.osname === 'android') {
	var activity = Titanium.Android.currentActivity;
	if(activity) {
		activity.onCreateOptionsMenu = function(e) {
			var menu = e.menu;
			var menuItem = menu.add({
				title: "再読込"
			});
			menuItem.setIcon("./dark/dark_refresh.png");
			menuItem.addEventListener("click", function(e) {
				loadShopList();
			});
		};
	}
} else {
	// 検索条件に基づき再検索
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