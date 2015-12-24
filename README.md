# Voie.js

**Voie** /vwa/ (fr. "way") is a simple router / layout manager for [Vue.js](http://vuejs.org).
Use it to build SPAs of your dreams.

Current status: **active development** — any feedback is appreciated.

Simple example app is available on [GitHub](https://github.com/inca/voie-example)
and [live on Netlify](http://voie-example.netlify.com/).

## Core concepts

Unlike official [vue-router](https://github.com/vuejs/vue-router) which
is organized around URLs, Voie is organized around _states_. Voie-based apps
are basically [finite-state machines](https://en.wikipedia.org/wiki/Finite-state_machine).

State is simply a _named_ logical "place" within your application. 

Each state can _optionally_ have:

  * URL pattern
  * Vue component
  * enter hook to populate state with data
  * leave hook to cleanup things

States are organized into hierarchies: child states will inherit parameters and data
from parent state. Also, if child state has a component, then it will be rendered at the location
specified by parent (or nearest ancestor) state denoted by `<v-view>` directive.

Consider this example:

```es6
app.add('user', {
  path: '/user/:userId',
  redirect: 'user.dashboard',   // specify "default" sub-state
  enter: (ctx) => {             // can return a Promise
    return fetch('/user/' + ctx.params.userId)
      .then(res => res.json())
      .then(data = ctx.data.user = data);
  },
  component: {
    template: '<div class="user-layout"><v-view></v-view></div>'
  }
});

app.add('user.dashboard', {
  component: {
    template: '<h1>Hello, {{ user.name }}!</h1>'
  }
});
```

In this example visiting `/user/123` would fetch a user with id `123` from a server
and then render following markup (assuming user has name "Alice"):

```html
<div class="user-layout">
  <h1>Hello, Alice!</h1>
</div>
```

## Installation

Examples assume ES6 and build environment
([browserify](http://browserify.org/) + [babelify](https://github.com/babel/babelify) 
or [webpack](https://webpack.github.io/) + [babel-loader](https://github.com/babel/babel-loader))
which is a mainstream.

```bash
npm i --save voie
```

You also need an [es6-shim](https://github.com/paulmillr/es6-shim) to make everything
go smooth in not-so-modern browsers.

## Usage

### State manager

Voie app is an instance of `StateManager`. You provide it with `el`, which
is an "entry-point" DOM node where views will be entered.

```es6
import { StateManager } from 'voie'

export default new StateManager({
  el: '#app'    // entry point, either a selector or HTMLElement
});
```

It is a good idea to expose state manager instance as a singleton module
(i.e. single instance per application)
since you will often want to use it in your Vue methods and stores.

### Define states

Next thing you want to do is to register some states.
Your app will probably contain plenty of states, so you'll need some structure.
I prefer "domain-centric" directory structure:

```es6
// states.js
import './users';
import './groups';
// ...
```

```es6
// users/index.js
import app from '../app';
import UsersLayout from './layout.vue';
import UsersList from './list.vue';

app.add('users', {
  component: UsersLayout
  ...
});
app.add('users.list', {
  component: UsersList,
  ...
});
app.add('users.create', { ... });
app.add('user', { ... });
app.add('user.view', { ... });
app.add('user.edit', { ... });
app.add('user.delete', { ... });
```

```es6
// groups/index.js
import app from '../app';

app.add('groups', { ... });
// ...
```

Structuring apps is a matter of preference, so you are free to choose
whatever suits you best.

### Running

Finally, run your state manager like this:

```es6
// index.js
import app from './app';
import './states';

app.start();
```

It will begin listening for history events and match-and-render current route.

## More usage

### States hierarchy

States are automatically organized into a tree-like structure. Each state
will have a single parent state. "Root" states would have a `null` parent

There are two ways of specifying a parent:

  * using dot character `.` in state name 
    (e.g. `user` -> `user.transaction` -> `user.transaction.details`)
    
  * explicitly using `parent` configuration parameter:
  
    ```es6
    app.add('users', { ... });
    app.add('user', {
      parent: 'users'
    });
    ```

Each way has its own advantages, so it's usually OK to use both styles in the same app.
Specifically, use qualified names to outline context (e.g. "User's profile page" would
be `user.profile`) or entity-relationship (e.g. "User's transactions list would
be `user.transactions`).

Specifying `parent` is handy in cases when you want to preserve concise and clean state name
while being able to use a different layout or add some global "enter" hook on state subtree.

A typical example would be authentication/authorization:

```es6
app.add('root', { ... });

app.add('login', {
  parent: 'root',
  ...
});

app.add('authenticated', {
  parent: 'root',
  enter: ctx => {
    if (!UserService.isAuthenticated()) {
      return { redirect: 'login' };
    }
  }
});

app.add('users', {
  parent: 'authenticated',
  ...
});

app.add('groups', {
  parent: 'authenticated',
  ...
});

```

### Navigating states

Use `stateManager.go` to navigate programmatically:

```es6
stateManager.go({
  name: 'user.dashboard',
  params: {
    userId: '123'
  }
});
```

In templates you can use `v-link` directive with the same semantics:

```html
<a v-link="{ name: 'user.dashboard', params: { userId: 123 } }">
  Dashboard
</a>
```

In addition to invoking `stateManager.go` it will also update the `href`
attribute and apply an `active` class if current state "includes"
the state specified by link.

Active class name can be customised globally:

```es6
new StateManager({
  el: '#el',
  activeClass: 'highlighted'
});
```

### Enter / leave

State can optionally define `enter` and `leave` hooks which are functions
that accept _state context_ object.

State context contains:

  * `params` — a hash of `string` parameters matched from URL pattern, 
    specified explicitly via `stateManager.go(...)` and inherited from parent context
  * `data` — object where you can write data to be exposed to Vue component and
    inherited states
  * `state` — `State` object to which this context corresponds
  * `parent` — parent context of this object
  
Typical `enter` hook will use `params` to fetch or prepare some data and expose it
via `data` object.

Both `enter` and `leave` can return a `Promise`, which makes hooks asynchronous.
In case of `enter` the component will only be entered when promise is resolved.

Example:

```es6
{
  enter: (ctx) => UserService.findByEmail(ctx.params.email)
    .then(user => ctx.data.user = user)
}
```

### Redirecting

Enter can optionally redirect to another state by
returning (or resolving via promise) an object like this: `{ redirect: 'state.name' }`.

Note that it's different from `redirect` configuration on `State`: 
when redirect is returned by `enter` hook the transition will always redirect
whenever it enters specified state (even if this state was not a destination).
In contrast, if `redirect` is specified as state configuration option it will 
only be effective when moving specifically to this state (in other words,
no redirect occurs when transitioning through this state to another one).

### State transitions

Consider following components hierarchy:

```
  A
/   \
B   D
|   |
C   E
```

Going from C to E implies:

  * leaving state C
  * leaving state B
  * entering state D
  * entering state E
  
By "leaving" we mean:

  * executing `leave` hook
  * destroying Vue component, if any
  * restoring the original state of `<v-view>` element where the component was rendered
  
By "entering" we mean:

  * preparing new context
  * executing `enter` hook
  * rendering Vue component, if any
  * preserving the original state of `<v-view>` so that it could later be restored
  
### Parameters

Each state has a specification of parameters it can accept when entered.
Mandatory parameters (e.g. `userId` for state `user`) are classically specified 
in pathname (e.g. `/user/28`).
Optional parameters (e.g. `page`, `limit` for lists) are usually specified
in querystring (e.g. `/users?page=5&limit=100`).

Here's how you define both parameter types when registering states:

```es6
app.add('user', {
  path: '/user/:userId',   // userId param is mandatory
  params: {
    section: null,        // these are optional
    collapsed: false      // with optional default values
  }
});
```

Both querystring and pathname parameters are accessible in `ctx.params` object
which is exposed both to `enter` hook and components.

Example:

```
location.href = '/user/123?section=profile&collapsed=true';
app.context.params
// { userId: '123', section: 'profile', collapsed: 'true' }
```

**Note:** Voie doesn't do any type conversion on params, so they are returned as strings.

When navigating between states specify parameters in `go` (or `v-link`):
 
```es6
app.go({
  name: 'user',
  params: {
    userId: '123',
    section: 'profile',
    unknown: 'wut?'     // Important, this will be dropped!
  }
});
```

**Note:** params must be listed explicitly when registering states,
all other parameters will be dropped. In the example above
parameter `unknown` is not specified in `path` or `params` of `user` state (or its ancestors),
so it's not part of `user` state spec and, therefore, will not be accessible in `ctx.params`.

### History

A common need for any web application is to update browser URL upon navigating to
a state with URL mapping, so that when the user presses "Refresh" application
loads the most recent state (not the "start" screen).
Decent SPAs would also have Back/Forward buttons working as expected.
We refer to these features as "history support".

Now there's two ways of implementing history support in your application:

  * **hash** (uncool, but fairly simple) — state will be maintained using
    hash portions of URL (e.g. `https://myapp/#user/1/transactions`)

  * **HTML5** (cool, a bit more complex) — state will be maintained using
    pathname portion of URL (e.g. `https://myapp/user/1/transactions`)
    
HTML5 history requires server-side setup: server must reply with the same HTML
wrapper to **all URLs** used by your application.

#### HTML5 server setup example

Here's an example [Express](http://expressjs.com) server:

```es6
import express from 'express';

let app = express();

// Allow using static resources with `/static` prefix
app.use('/static', express.static('static'));

// Serve application data with `/~` prefix
app.use('/~', appDataRouter);

// Serve SPA entry-point HTML to all other routes
app.get('/*', (req, res) => res.sendFile('app.html'))
```

This example shows potential gotchas: 
since `app.html` will be served for all GET requests, in order
to serve other resources (e.g. static or compiled assets, scripts, 
stylesheets, application data, etc.) you'll need separate prefixes.
Without these prefixes it won't be easy to configure your front web server
([nginx](http://nginx.org/en/) or Apache) for production.

#### History setup

Voie uses awesome [history](https://github.com/rackt/history) 
to provide apps with history support. HTML5 mode is used by default.

Here's how to switch to hash-history (you need to install `history`):

```es6
// app.js
import { StateManager } from 'voie';
import { createHashHistory } from 'history';

export default new StateManager({
  el: '#app',
  history: createHashHistory()
});
```

See [history docs](https://github.com/rackt/history/tree/master/docs)
for more options.

#### Base URL

It's a bit easier to setup servers using "base" URL for your app, e.g.:

```
app.get('/app*', (req, res) => res.sendFile('app.html')) 
```

In this case all you need to do is to add `<base href="/app"/>`
inside the `<head>` of your HTML wrapper.

Or you can just specify `base` configuration parameter (it's only used
when `history` is not present):

```es6
// app.js
import { StateManager } from 'voie';

export default new StateManager({
  el: '#app',
  base: '/app'
});
```

### More docs

Voie is in active development, so more docs are coming soon.

## License (ISC)

Copyright (c) 2015-2016, Boris Okunskiy <boris@okunskiy.name>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
