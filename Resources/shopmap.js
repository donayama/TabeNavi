// shopmap.js
var win = Titanium.UI.currentWindow;

// 引き継ぎデータ
var shopData = win.shopData;

// ピンの生成
var pin = Titanium.Map.createAnnotation({
	latitude: shopData.Latitude,
	longitude: shopData.Longitude,
	title: shopData.RestaurantName,
	subtitle: shopData.Tel,
	pincolor:Titanium.Map.ANNOTATION_RED,
	animate:true
});

// MapViewの作成
var mapview = Titanium.Map.createView({
	// 通常の地図表示
	mapType: Titanium.Map.STANDARD_TYPE,
	// 表示領域の指定（中心座標とズーム）
	region: {
		latitude: shopData.Latitude,
		longitude: shopData.Longitude,
		latitudeDelta:0.01,
		longitudeDelta:0.01
	},
	// 移動時アニメーションの有無
	animate:true,
	// Mapの大きさを表示領域に合わせる
	regionFit:true,
	// ユーザの現在地を表示する
	userLocation:true,
	// ピンをたてる
	annotations:[ pin ]
});
win.add(mapview);