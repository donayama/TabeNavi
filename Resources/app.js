// デフォルトの背景色は白にする
Titanium.UI.setBackgroundColor('#ffc');

// TabGroupの作成
var tabGroup = Titanium.UI.createTabGroup({
	backgroundColor: '#000',
	color:'#fff'
});

// 店舗情報
var tabShopList = Titanium.UI.createTab({
	icon: './dark/dark_bldg.png',
	title:'店舗情報',
	window:Titanium.UI.createWindow({
		title:'店舗検索',
		backgroundColor:'#fff',
		url: 'shoplist.js'
	})
});

// お気に入り
var tabFavorites = Titanium.UI.createTab({
	icon: './dark/dark_star.png',
	title:'お気に入り',
	window:Titanium.UI.createWindow({
		title:'お気に入り',
		backgroundColor:'#fff',
		url: 'favorites.js'
	})
});

// 設定
var tabConfig = Titanium.UI.createTab({
	icon: './dark/dark_gear.png',
	title:'設定',
	window:Titanium.UI.createWindow({
		title:'設定',
		backgroundColor:'#fff',
		url: 'config.js'
	})
});

//  add tabs
tabGroup.addTab(tabShopList);
tabGroup.addTab(tabFavorites);
tabGroup.addTab(tabConfig);

// open tab group
tabGroup.open();

// データベースファイルを開きます（ない場合、作成されます）
var db = Titanium.Database.open('tabenavi');
try {
	// DB内にテーブルが無い場合、定義に基づいてテーブルを作成します。
	var sql = 'CREATE TABLE IF NOT EXISTS FAVORITES (' +
	'RCD        INTEGER, ' +
	'RNAME      TEXT,' +
	'LAT        REAL,' +
	'LNG        REAL,' +
	'JSON       TEXT,' +
	'UPDATED_ON TEXT'  +
	')';
	db.execute(sql);

	// FAVORITESテーブルをSELECTします。
	var rows = db.execute('SELECT COUNT(*) CNT FROM FAVORITES');
	while(rows.isValidRow()) {
		// rows.field(field_no)で値を取得します。
		// カラム名（もしくはエイリアス）ベースでも取れます。
		Titanium.API.info('お気に入り件数：' + rows.field(0));
		Titanium.API.info('お気に入り件数：' + rows.fieldByName('CNT'));
		rows.next();
	}
	// 走査が終わったらResultSetを閉じておきます。
	rows.close();
	rows = null;
} catch(ex) {
	Titanium.API.info(ex);
}
// 操作が終わったら後片付け
db.close();
db = null;