// shopdata.js
var win = Titanium.UI.currentWindow;

// 引き継ぎデータ
var item = win.shopData;

// ShopDataオブジェクト
var ShopData = {};
(function() {
	//--------------------------------------
	// ロジック部分
	//--------------------------------------
	ShopData.addFavorite = function() {
		var dialog = Titanium.UI.createAlertDialog({
			title: '確認',
			message: 'お気に入りに追加しますか？',
			buttonNames: ['はい','いいえ']
		})
		dialog.addEventListener('click', function(e) {
			if(e.index == 0) {
				// お気に入り追加処理を行う。
				// データベースファイルを開きます。
				var db = Titanium.Database.open('tabenavi');
				try {
					// すでにお気に入りに追加されている場合はUPDATEするため
					// 存在確認を行います。
					var forUpdate = false;
					var rows = db.execute(
					'SELECT COUNT(*) CNT FROM FAVORITES WHERE RCD = ?',
					item.Rcd
					);
					// 値の取得
					if(rows.isValidRow()) {
						if(rows.field(0) != 0) {
							forUpdate = true;
						}
					}
					// ResultSetを閉じておきます。
					rows.close();
					rows = null;

					if(forUpdate) {
						db.execute(
						"UPDATE FAVORITES SET RNAME = ?, LAT = ?, LNG = ?, JSON = ?, UPDATED_ON = datetime('now') " +
						" WHERE RCD = ?",
						item.RestaurantName, item.Latitude, item.Longitude,
						JSON.stringify(item), item.Rcd
						);
					} else {
						db.execute(
						"INSERT INTO FAVORITES (RCD, RNAME, LAT, LNG, JSON, UPDATED_ON)" +
						" VALUES(?, ?, ?, ?, ?, datetime('now'))",
						item.Rcd, item.RestaurantName, item.Latitude, item.Longitude,
						JSON.stringify(item)
						);
					}
					Titanium.API.info('追加・更新された行数 = ' + db.rowsAffected);
				} catch(ex) {
					Titanium.API.info(ex);
				}
				// 操作が終わったら後片付け
				db.close();
				db = null;
			}
		});
		dialog.show();
	};
	//--------------------------------------
	// UI部分
	//--------------------------------------
	ShopData.tableView = Titanium.UI.createTableView({
		style: Titanium.UI.iPhone.TableViewStyle.GROUPD,
		rowHeight: 32,
		footerTitle: 'Powered By 食べログAPI'
	});
	ShopData.buildRowData = function(title, data, func) {
		// データが空の時は飛ばす
		if(!data || data === '') {
			return;
		}
		// ヘッダ表示のためにTableViewSectionを用いる。
		var section = Titanium.UI.createTableViewSection();
		section.headerView = (function() {
			var view = Titanium.UI.createView({
				backgroundColor: '#999'
			});
			// ヘッダに載せる見出し
			view.add(Titanium.UI.createLabel({
				top: 2,
				bottom:2,
				left: 2,
				right: 2,
				text: title
			}));
			return view;
		})();
		// 各行にはデータを表示する。
		var row = Titanium.UI.createTableViewRow();
		row.add(Titanium.UI.createLabel({
			text:data,
			left: 8,
			right: 8
		}));
		// click時イベントを指定しているときは詳細ボタンを表示する
		if(func != null) {
			row.hasDetail = true;
			row.addEventListener('click', func);
		}
		section.add(row);
		return section;
	};
	// TableViewを構成する
	ShopData.buildTableView = function() {
		var data = [];
		data.push(ShopData.buildRowData('ジャンル', item.Category));
		data.push(ShopData.buildRowData('店舗名', item.RestaurantName, function() {
			// 店舗名をクリックすると食べログのページを表示する
			var webWindow = Titanium.UI.createWindow({
				title: item.RestaurantName,
				backgroundColor: '#fff'
			});
			webWindow.add(Titanium.UI.createWebView({
				//		url: item.TabelogMobileUrl
				url: item.TabelogUrl
			}));
			Titanium.UI.currentTab.open(webWindow, {
				animated: true
			});
		}));
		data.push(ShopData.buildRowData('最寄り駅', item.StationName));
		data.push(ShopData.buildRowData('住所', item.Address, function() {
			// 住所をクリックすると地図を表示する
			var mapWindow = Titanium.UI.createWindow({
				title: item.RestaurantName,
				backgroundColor: '#fff',
				shopData: item,
				url: 'shopmap.js'
			});
			Titanium.UI.currentTab.open(mapWindow, {
				animated: true
			});
		}));
		data.push(ShopData.buildRowData('電話番号', item.Tel));
		data.push(ShopData.buildRowData('営業時間', item.BusinessHours));
		data.push(ShopData.buildRowData('休日', item.Holiday));
		data.push(ShopData.buildRowData('シチュエーション', item.Situation));
		data.push(ShopData.buildRowData('価格', (function() {
			var text = '';
			if(item.LunchPrice) {
				text += '昼：' + item.LunchPrice;
			}
			if(item.DinnerPrice) {
				if(text != '') {
					text += "\n";
				}
				text += '昼：' + item.DinnerPrice;
			}
			return text;
		})()));
		data.push(ShopData.buildRowData('総合評価', item.TotalScore));
		data.push(ShopData.buildRowData('料理・味', item.TasteScore));
		data.push(ShopData.buildRowData('サービス', item.ServiceScore));
		data.push(ShopData.buildRowData('雰囲気', item.MoodScore));
		// 口コミと投稿された写真の表示
		data.push(ShopData.buildRowData('口コミ', '表示する', function() {
			// 口コミ表示ウィンドウを表示する
			var reviewWindow = Titanium.UI.createWindow({
				title: item.RestaurantName,
				backgroundColor: '#fff',
				shopData: item,
				url: 'shopreview.js'
			});
			Titanium.UI.currentTab.open(reviewWindow, {
				animated: true
			});
		}));
		if(Titanium.Platform.osname !== 'android') {
			data.push(ShopData.buildRowData('投稿された画像（最新５件）', '表示する', function() {
				// 画像表示ウィンドウを表示する
				var photoWindow = Titanium.UI.createWindow({
					title: item.RestaurantName,
					backgroundColor: '#fff',
					shopData: item,
					url: 'shopphoto.js'
				});
				Titanium.UI.currentTab.open(photoWindow, {
					animated: true
				});
			}));
		}
		ShopData.tableView.data = data;
	};
})();
ShopData.buildTableView();
win.add(ShopData.tableView);

// お気に入りに追加するボタン
if(win.owner !== 'favorites') {
	win.rightNavButton = (function() {
		var addButton = Titanium.UI.createButton({
			systemButton:Titanium.UI.iPhone.SystemButton.ADD
		});
		addButton.addEventListener('click', function() {
			ShopData.addFavorite();
		});
		return addButton;
	})();
}
if(Titanium.Platform.osname === 'android') {
	var activity = Titanium.Android.currentActivity;
	if(activity) {
		activity.onCreateOptionsMenu = function(e) {
			var menu = e.menu;
			if(win.owner !== 'favorites') {
				var menuItem = menu.add({
					title: "お気に入りに追加"
				});
				menuItem.setIcon("./dark/dark_add.png");
				menuItem.addEventListener("click", function(e) {
					ShopData.addFavorite();
				});
			} else {
				var menuItem = menu.add({
					title: "お気に入りから削除"
				});
				menuItem.setIcon("./dark/dark_x.png");
				menuItem.addEventListener("click", function(e) {
					// データベースファイルを開きます。
					var db = Titanium.Database.open('tabenavi');
					try {
						db.execute(
						"DELETE FROM FAVORITES WHERE RCD = ?", item.Rcd
						);
						Titanium.API.info('削除された行数 = ' + db.rowsAffected);
					} catch(ex) {
						Titanium.API.info(ex);
					}
					// 操作が終わったら後片付け
					db.close();
					db = null;
					win.close();
				});
			}
		};
	}
}