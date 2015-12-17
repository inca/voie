# Voie.js

**Voie** /vwa/ (fr. "way") is a simple router / layout manager for [Vue.js](http://vuejs.org).
Use it to build SPAs of your dreams.

Current status: **active development** — any feedback appreciated.

## Core concepts

Unlike official [vue-router](https://github.com/vuejs/vue-router) which
is organized around URLs, Voie is organized around _states_. Voie-based apps
are basically [finite-state machines](https://en.wikipedia.org/wiki/Finite-state_machine).

### State

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
  url: '/user/:userId',
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

app.add('users', { ... });
app.add('users.list', { ... });
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

Also be sure to check our [end-to-end test application](test/e2e/) to find more
about structuring apps.

### Running

Finally, run your state manager like this:

```es6
// index.js
import app from './app';
import './states';

app.start();
```

It will begin listening for history events and match-and-render current route.

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
  
### More docs

Voie is in active development, so more docs are coming soon.

## License (ISC)

Copyright (c) 2015-2016, Boris Okunskiy <boris@okunskiy.name>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
