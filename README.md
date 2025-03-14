# hybrid-bridge-js

English | [简体中文](./README.zh-CN.md)
A JavaScript bridge library for communication between Web and Native (iOS/Android) applications.

## Installation

```bash
yarn add hybrid-bridge-js
```

# Usage

```js
import JSBridge from 'hybrid-bridge-js';

// Call Native method
JSBridge.invoke('nativeMethod', { param: 'value' })
  .then(result => {
    console.log('Native result:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  });

// Register H5 method for Native calls
JSBridge.register('webMethod', (data, callback) => {
  console.log('Received from native:', data);
  callback({ success: true });
});
```

## API Reference
### JSBridge.invoke(method: string, data?: object): Promise
Call a native method.

### JSBridge.register(method: string, handler: Function): void
Register an H5 method for native calls.

### JSBridge.receive(callbackId: string, result: any, error?: string): void
Receive callback results from native methods.

### JSBridge.call(method: string, data?: object, callbackId?: string): void
For native to call registered H5 methods.

## Framework Integration
### Vue.js

```js
import { onMounted } from 'vue';
import JSBridge from 'hybrid-bridge-js';

onMounted(() => {
  JSBridge.register('getUser', (data, callback) => {
    console.log('Native calls H5 getUser method, params:', data);
    callback({
      userId: 12345,
      nickname: 'John',
      token: 'abcd1234xyz',
    });
  });
});
```

### React

```js
import { useEffect } from 'react';
import JSBridge from 'hybrid-bridge-js';

useEffect(() => {
  JSBridge.register('getUser', (data, callback) => {
    console.log('Native calls H5 getUser method, params:', data);
    callback({
      userId: 12345,
      nickname: 'John',
      token: 'abcd1234xyz',
    });
  });
}, []);
```

```swift
class WebViewController: UIViewController, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "getAccessToken" {
            let callbackId = (message.body as? [String: Any])?["callbackId"] as? String ?? ""
            let accessToken = "abcdef123456"
            webView.evaluateJavaScript("JSBridge.receive('\(callbackId)', '\(accessToken)')", nil)
        }
    }
}
```
### Android (Java/Kotlin)

```javs
class JSBridgeInterface {
    @JavascriptInterface
    public void getAccessToken(String json) {
        try {
            JSONObject obj = new JSONObject(json);
            String callbackId = obj.getString("callbackId");
            String accessToken = "abcdef123456";
            String jsCode = "JSBridge.receive('" + callbackId + "', '" + accessToken + "')";
            webView.post(() -> webView.evaluateJavascript(jsCode, null));
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
```
