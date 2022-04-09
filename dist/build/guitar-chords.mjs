var GuitarChords = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    const CHORDS = {
      C: [
        {
          strings: 'X 3 2 0 1 0',
          fingering: 'X 3 2 X 1 X',
          chordName: 'C,,,',
          enharmonicChordName: 'C,,,',
          voicingID: '9223372036855826559',
          tones: 'C,E,G'
        },
        {
          strings: 'X 3 5 5 4 3',
          fingering: 'X 1 3 4 2 1',
          chordName: 'C,m,,',
          enharmonicChordName: 'C,m,,',
          voicingID: '9223372036959802495',
          tones: 'C,Eb,G'
        },
        {
          strings: 'X 3 2 3 1 0',
          fingering: 'X 3 2 4 1 X',
          chordName: 'C,,7,',
          enharmonicChordName: 'C,,7,',
          voicingID: '9223372036855924863',
          tones: 'C,E,G,Bb'
        },
        {
          strings: 'X 3 5 4 5 3',
          fingering: 'X 1 3 2 4 1',
          chordName: 'C,maj,7,',
          enharmonicChordName: 'C,maj,7,',
          voicingID: '9223372036960818303',
          tones: 'C,E,G,B'
        },
        {
          strings: 'X 3 5 3 4 3',
          fingering: 'X 1 3 1 2 1',
          chordName: 'C,m,7,',
          enharmonicChordName: 'C,m,7,',
          voicingID: '9223372036959736959',
          tones: 'C,Eb,G,Bb'
        },
        {
          strings: 'X 3 5 X X X',
          fingering: 'X 1 3 X X X',
          chordName: 'C,,5,',
          enharmonicChordName: 'C,,5,',
          voicingID: '9223372037928490111',
          tones: 'C,G'
        },
        {
          strings: 'X 3 4 2 4 X',
          fingering: 'X 2 3 1 4 X',
          chordName: 'C,dim,7,',
          enharmonicChordName: 'C,dim,7,',
          voicingID: '9223372037899227263',
          tones: 'C,Eb,Gb,A'
        },
        {
          strings: 'X 3 4 3 4 X',
          fingering: 'X 1 3 2 4 X',
          chordName: 'C,m,7b5,',
          enharmonicChordName: 'C,m,7b5,',
          voicingID: '9223372037899260031',
          tones: 'C,Eb,Gb,Bb'
        },
        {
          strings: 'X 3 X 0 5 5',
          fingering: 'X 1 X X 3 4',
          chordName: 'C,,6,',
          enharmonicChordName: 'C,,6,',
          voicingID: '9223372037027822719',
          tones: 'C,E,G,A'
        },
        {
          strings: 'X 3 5 2 4 X',
          fingering: 'X 2 4 1 3 X',
          chordName: 'C,m,6,',
          enharmonicChordName: 'C,m,6,',
          voicingID: '9223372037899228287',
          tones: 'C,Eb,G,A'
        }
      ],
      Db: [
        {
          strings: 'X 4 3 1 2 1',
          fingering: 'X 4 3 1 2 1',
          chordName: 'Db,,,',
          enharmonicChordName: 'C#,,,',
          voicingID: '9223372036890463391',
          tones: 'Db,F,Ab'
        },
        {
          strings: 'X 4 6 6 5 4',
          fingering: 'X 1 3 4 2 1',
          chordName: 'Db,m,,',
          enharmonicChordName: 'C#,m,,',
          voicingID: '9223372036994439327',
          tones: 'C#,E,G#'
        },
        {
          strings: 'X 4 6 4 6 4',
          fingering: 'X 1 3 1 4 1',
          chordName: 'Db,,7,',
          enharmonicChordName: 'C#,,7,',
          voicingID: '9223372036995422367',
          tones: 'Db,F,Ab,B'
        },
        {
          strings: 'X 4 6 5 6 4',
          fingering: 'X 1 3 2 4 1',
          chordName: 'Db,maj,7,',
          enharmonicChordName: 'C#,maj,7,',
          voicingID: '9223372036995455135',
          tones: 'Db,F,Ab,C'
        },
        {
          strings: 'X 4 2 1 0 0',
          fingering: 'X 4 2 1 X X',
          chordName: 'Db,m,7,',
          enharmonicChordName: 'C#,m,7,',
          voicingID: '9223372036854810783',
          tones: 'C#,E,G#,B'
        },
        {
          strings: 'X 4 6 X X X',
          fingering: 'X 1 3 X X X',
          chordName: 'Db,,5,',
          enharmonicChordName: 'C#,,5,',
          voicingID: '9223372037928491167',
          tones: 'C#,G#'
        },
        {
          strings: 'X 4 5 3 5 X',
          fingering: 'X 2 3 1 4 X',
          chordName: 'Db,dim,7,',
          enharmonicChordName: 'C#,dim,7,',
          voicingID: '9223372037900309663',
          tones: 'C#,E,G,A#'
        },
        {
          strings: 'X 4 2 0 0 X',
          fingering: 'X 4 2 X X X',
          chordName: 'Db,m,7b5,',
          enharmonicChordName: 'C#,m,7b5,',
          voicingID: '9223372037894965407',
          tones: 'C#,E,G,B'
        },
        {
          strings: 'X 4 6 6 6 6',
          fingering: 'X 1 3 3 3 3',
          chordName: 'Db,,6,',
          enharmonicChordName: 'C#,,6,',
          voicingID: '9223372037062596767',
          tones: 'Db,F,Ab,Bb'
        },
        {
          strings: 'X 4 6 3 5 X',
          fingering: 'X 2 4 1 3 X',
          chordName: 'Db,m,6,',
          enharmonicChordName: 'C#,m,6,',
          voicingID: '9223372037900310687',
          tones: 'C#,E,G#,A#'
        }
      ],
      D: [
        {
          strings: 'X X 0 2 3 2',
          fingering: 'X X X 1 3 2',
          chordName: 'D,,,',
          enharmonicChordName: 'D,,,',
          voicingID: '9223372036925096959',
          tones: 'D,F#,A'
        },
        {
          strings: 'X X 0 2 3 1',
          fingering: 'X X X 2 3 1',
          chordName: 'D,m,,',
          enharmonicChordName: 'D,m,,',
          voicingID: '9223372036891542527',
          tones: 'D,F,A'
        },
        {
          strings: 'X X 0 2 1 2',
          fingering: 'X X X 2 1 3',
          chordName: 'D,,7,',
          enharmonicChordName: 'D,,7,',
          voicingID: '9223372036922999807',
          tones: 'D,F#,A,C'
        },
        {
          strings: 'X X 0 2 2 2',
          fingering: 'X X X 2 3 4',
          chordName: 'D,maj,7,',
          enharmonicChordName: 'D,maj,7,',
          voicingID: '9223372036924048383',
          tones: 'D,F#,A,C#'
        },
        {
          strings: 'X X 0 2 1 1',
          fingering: 'X X X 2 1 1',
          chordName: 'D,m,7,',
          enharmonicChordName: 'D,m,7,',
          voicingID: '9223372036889445375',
          tones: 'D,F,A,C'
        },
        {
          strings: 'X X 0 2 X X',
          fingering: 'X X X 2 X X',
          chordName: 'D,,5,',
          enharmonicChordName: 'D,,5,',
          voicingID: '9223372037927535615',
          tones: 'D,A'
        },
        {
          strings: 'X X 0 1 0 1',
          fingering: 'X X X 1 X 2',
          chordName: 'D,dim,7,',
          enharmonicChordName: 'D,dim,7,',
          voicingID: '9223372036888364031',
          tones: 'D,F,Ab,B'
        },
        {
          strings: 'X X 0 1 1 1',
          fingering: 'X X X 1 1 1',
          chordName: 'D,m,7b5,',
          enharmonicChordName: 'D,m,7b5,',
          voicingID: '9223372036889412607',
          tones: 'D,F,Ab,C'
        },
        {
          strings: 'X X 0 2 0 2',
          fingering: 'X X X 2 X 3',
          chordName: 'D,,6,',
          enharmonicChordName: 'D,,6,',
          voicingID: '9223372036921951231',
          tones: 'D,F#,A,B'
        },
        {
          strings: 'X X 0 2 0 1',
          fingering: 'X X X 2 X 1',
          chordName: 'D,m,6,',
          enharmonicChordName: 'D,m,6,',
          voicingID: '9223372036888396799',
          tones: 'D,F,A,B'
        }
      ],
      Eb: [
        {
          strings: 'X 6 5 3 4 3',
          fingering: 'X 4 3 1 2 1',
          chordName: 'Eb,,,',
          enharmonicChordName: 'D#,,,',
          voicingID: '9223372036959737055',
          tones: 'Eb,G,Bb'
        },
        {
          strings: 'X X 1 3 4 2',
          fingering: 'X X 1 3 4 2',
          chordName: 'Eb,m,,',
          enharmonicChordName: 'D#,m,,',
          voicingID: '9223372036926179327',
          tones: 'Eb,Gb,Bb'
        },
        {
          strings: 'X X 1 3 2 3',
          fingering: 'X X 1 3 2 4',
          chordName: 'Eb,,7,',
          enharmonicChordName: 'D#,,7,',
          voicingID: '9223372036957636607',
          tones: 'Eb,G,Bb,Db'
        },
        {
          strings: 'X X 1 3 3 3',
          fingering: 'X X 1 2 3 4',
          chordName: 'Eb,maj,7,',
          enharmonicChordName: 'D#,maj,7,',
          voicingID: '9223372036958685183',
          tones: 'Eb,G,Bb,D'
        },
        {
          strings: 'X X 1 3 2 2',
          fingering: 'X X 1 4 2 3',
          chordName: 'Eb,m,7,',
          enharmonicChordName: 'D#,m,7,',
          voicingID: '9223372036924082175',
          tones: 'Eb,Gb,Bb,Db'
        },
        {
          strings: 'X X 1 3 X X',
          fingering: 'X X 1 3 X X',
          chordName: 'Eb,,5,',
          enharmonicChordName: 'D#,,5,',
          voicingID: '9223372037927569407',
          tones: 'Eb,Bb'
        },
        {
          strings: 'X X 1 2 1 2',
          fingering: 'X X 1 3 2 4',
          chordName: 'Eb,dim,7,',
          enharmonicChordName: 'D#,dim,7,',
          voicingID: '9223372036923000831',
          tones: 'Eb,Gb,A,C'
        },
        {
          strings: 'X X 1 2 2 2',
          fingering: 'X X 1 2 3 4',
          chordName: 'Eb,m,7b5,',
          enharmonicChordName: 'D#,m,7b5,',
          voicingID: '9223372036924049407',
          tones: 'Eb,Gb,A,Db'
        },
        {
          strings: 'X X 1 3 1 3',
          fingering: 'X X 1 3 1 4',
          chordName: 'Eb,,6,',
          enharmonicChordName: 'D#,,6,',
          voicingID: '9223372036956588031',
          tones: 'Eb,G,Bb,C'
        },
        {
          strings: 'X X 1 3 1 2',
          fingering: 'X X 1 3 1 2',
          chordName: 'Eb,m,6,',
          enharmonicChordName: 'D#,m,6,',
          voicingID: '9223372036923033599',
          tones: 'Eb,Gb,Bb,C'
        }
      ],
      E: [
        {
          strings: '0 2 2 1 0 0',
          fingering: 'X 2 3 1 X X',
          chordName: 'E,,,',
          enharmonicChordName: 'E,,,',
          voicingID: '9223372036854810688',
          tones: 'E,G#,B'
        },
        {
          strings: '0 2 2 0 0 0',
          fingering: 'X 2 3 X X X',
          chordName: 'E,m,,',
          enharmonicChordName: 'E,m,,',
          voicingID: '9223372036854777920',
          tones: 'E,G,B'
        },
        {
          strings: '0 2 0 1 0 0',
          fingering: 'X 2 X 1 X X',
          chordName: 'E,,7,',
          enharmonicChordName: 'E,,7,',
          voicingID: '9223372036854808640',
          tones: 'E,G#,B,D'
        },
        {
          strings: '0 X 2 4 4 4',
          fingering: 'X X 1 2 3 4',
          chordName: 'E,maj,7,',
          enharmonicChordName: 'E,maj,7,',
          voicingID: '9223372036993321952',
          tones: 'E,G#,B,D#'
        },
        {
          strings: '0 2 0 0 0 0',
          fingering: 'X 2 X X X X',
          chordName: 'E,m,7,',
          enharmonicChordName: 'E,m,7,',
          voicingID: '9223372036854775872',
          tones: 'E,G,B,D'
        },
        {
          strings: '0 2 X X X X',
          fingering: 'X 2 X X X X',
          chordName: 'E,,5,',
          enharmonicChordName: 'E,,5,',
          voicingID: '9223372037928516672',
          tones: 'E,B'
        },
        {
          strings: '0 X 2 3 2 3',
          fingering: 'X X 1 3 2 4',
          chordName: 'E,dim,7,',
          enharmonicChordName: 'E,dim,7,',
          voicingID: '9223372036957637600',
          tones: 'E,G,Bb,C#'
        },
        {
          strings: '0 X 0 3 3 3',
          fingering: 'X X X 2 3 4',
          chordName: 'E,m,7b5,',
          enharmonicChordName: 'E,m,7b5,',
          voicingID: '9223372036958684128',
          tones: 'E,G,Bb,D'
        },
        {
          strings: '0 X 2 4 2 4',
          fingering: 'X X 1 3 1 4',
          chordName: 'E,,6,',
          enharmonicChordName: 'E,,6,',
          voicingID: '9223372036991224800',
          tones: 'E,G#,B,C#'
        },
        {
          strings: '0 2 2 0 2 X',
          fingering: 'X 2 3 X 4 X',
          chordName: 'E,m,6,',
          enharmonicChordName: 'E,m,6,',
          voicingID: '9223372037897062464',
          tones: 'E,G,B,C#'
        }
      ],
      F: [
        {
          strings: '1 3 3 2 1 1',
          fingering: '1 3 4 2 1 1',
          chordName: 'F,,,',
          enharmonicChordName: 'F,,,',
          voicingID: '9223372036889447521',
          tones: 'F,A,C'
        },
        {
          strings: '1 3 3 1 1 1',
          fingering: '1 3 4 1 1 1',
          chordName: 'F,m,,',
          enharmonicChordName: 'F,m,,',
          voicingID: '9223372036889414753',
          tones: 'F,Ab,C'
        },
        {
          strings: '1 3 1 2 4 1',
          fingering: '1 3 1 2 4 1',
          chordName: 'F,,7,',
          enharmonicChordName: 'F,,7,',
          voicingID: '9223372036892591201',
          tones: 'F,A,C,Eb'
        },
        {
          strings: '1 X 2 2 1 0',
          fingering: '1 X 3 4 2 X',
          chordName: 'F,maj,7,',
          enharmonicChordName: 'F,maj,7,',
          voicingID: '9223372036855892961',
          tones: 'F,A,C,E'
        },
        {
          strings: '1 3 1 1 1 1',
          fingering: '1 3 1 1 1 1',
          chordName: 'F,m,7,',
          enharmonicChordName: 'F,m,7,',
          voicingID: '9223372036889412705',
          tones: 'F,Ab,C,Eb'
        },
        {
          strings: '1 3 X X X X',
          fingering: '1 3 X X X X',
          chordName: 'F,,5,',
          enharmonicChordName: 'F,,5,',
          voicingID: '9223372037928516705',
          tones: 'F,C'
        },
        {
          strings: '1 X 0 1 0 X',
          fingering: '1 X X 3 X X',
          chordName: 'F,dim,7,',
          enharmonicChordName: 'F,dim,7,',
          voicingID: '9223372037894996961',
          tones: 'F,Ab,B,D'
        },
        {
          strings: '1 X 1 1 0 1',
          fingering: '1 X 2 3 X 4',
          chordName: 'F,m,7b5,',
          enharmonicChordName: 'F,m,7b5,',
          voicingID: '9223372036888365025',
          tones: 'F,Ab,B,Eb'
        },
        {
          strings: '1 X 0 2 1 X',
          fingering: '1 X X 4 3 X',
          chordName: 'F,,6,',
          enharmonicChordName: 'F,,6,',
          voicingID: '9223372037896078305',
          tones: 'F,A,C,D'
        },
        {
          strings: '1 X 0 1 1 X',
          fingering: '1 X X 3 4 X',
          chordName: 'F,m,6,',
          enharmonicChordName: 'F,m,6,',
          voicingID: '9223372037896045537',
          tones: 'F,Ab,C,D'
        }
      ],
      Gb: [
        {
          strings: '2 4 4 3 2 2',
          fingering: '1 3 4 2 1 1',
          chordName: 'Gb,,,',
          enharmonicChordName: 'F#,,,',
          voicingID: '9223372036924084354',
          tones: 'Gb,Bb,Db'
        },
        {
          strings: '2 4 4 2 2 2',
          fingering: '1 3 4 1 1 1',
          chordName: 'Gb,m,,',
          enharmonicChordName: 'F#,m,,',
          voicingID: '9223372036924051586',
          tones: 'F#,A,C#'
        },
        {
          strings: '2 4 2 3 5 2',
          fingering: '1 3 1 2 4 1',
          chordName: 'Gb,,7,',
          enharmonicChordName: 'F#,,7,',
          voicingID: '9223372036927228034',
          tones: 'F#,A#,C#,E'
        },
        {
          strings: '2 X 3 3 2 X',
          fingering: '1 X 3 4 2 X',
          chordName: 'Gb,maj,7,',
          enharmonicChordName: 'F#,maj,7,',
          voicingID: '9223372037897162722',
          tones: 'Gb,Bb,Db,F'
        },
        {
          strings: '2 4 2 2 2 2',
          fingering: '1 3 1 1 1 1',
          chordName: 'Gb,m,7,',
          enharmonicChordName: 'F#,m,7,',
          voicingID: '9223372036924049538',
          tones: 'F#,A,C#,E'
        },
        {
          strings: '2 4 X X X X',
          fingering: '1 3 X X X X',
          chordName: 'Gb,,5,',
          enharmonicChordName: 'F#,,5,',
          voicingID: '9223372037928516738',
          tones: 'F#,C#'
        },
        {
          strings: '2 X 1 2 1 X',
          fingering: '2 X 1 4 1 X',
          chordName: 'Gb,dim,7,',
          enharmonicChordName: 'F#,dim,7,',
          voicingID: '9223372037896079330',
          tones: 'F#,A,C,D#'
        },
        {
          strings: '2 X 2 2 1 0',
          fingering: '2 X 3 4 1 X',
          chordName: 'Gb,m,7b5,',
          enharmonicChordName: 'F#,m,7b5,',
          voicingID: '9223372036855892962',
          tones: 'F#,A,C,E'
        },
        {
          strings: '2 X 1 3 2 X',
          fingering: '2 X 1 4 3 X',
          chordName: 'Gb,,6,',
          enharmonicChordName: 'F#,,6,',
          voicingID: '9223372037897160674',
          tones: 'Gb,Bb,Db,Eb'
        },
        {
          strings: '2 X 1 2 2 X',
          fingering: '2 X 1 3 4 X',
          chordName: 'Gb,m,6,',
          enharmonicChordName: 'F#,m,6,',
          voicingID: '9223372037897127906',
          tones: 'F#,A,C#,D#'
        }
      ],
      G: [
        {
          strings: '3 2 0 0 3 3',
          fingering: '2 1 X X 3 4',
          chordName: 'G,,,',
          enharmonicChordName: 'G,,,',
          voicingID: '9223372036958584899',
          tones: 'G,B,D'
        },
        {
          strings: '3 5 5 3 3 3',
          fingering: '1 3 4 1 1 1',
          chordName: 'G,m,,',
          enharmonicChordName: 'G,m,,',
          voicingID: '9223372036958688419',
          tones: 'G,Bb,D'
        },
        {
          strings: '3 2 0 0 0 1',
          fingering: '3 2 X X X 1',
          chordName: 'G,,7,',
          enharmonicChordName: 'G,,7,',
          voicingID: '9223372036888330307',
          tones: 'G,B,D,F'
        },
        {
          strings: '3 X 4 4 3 X',
          fingering: '1 X 3 4 2 X',
          chordName: 'G,maj,7,',
          enharmonicChordName: 'G,maj,7,',
          voicingID: '9223372037898245091',
          tones: 'G,B,D,F#'
        },
        {
          strings: '3 5 3 3 3 3',
          fingering: '1 3 1 1 1 1',
          chordName: 'G,m,7,',
          enharmonicChordName: 'G,m,7,',
          voicingID: '9223372036958686371',
          tones: 'G,Bb,D,F'
        },
        {
          strings: '3 5 X X X X',
          fingering: '1 3 X X X X',
          chordName: 'G,,5,',
          enharmonicChordName: 'G,,5,',
          voicingID: '9223372037928516771',
          tones: 'G,D'
        },
        {
          strings: '3 X 2 3 2 X',
          fingering: '2 X 1 4 1 X',
          chordName: 'G,dim,7,',
          enharmonicChordName: 'G,dim,7,',
          voicingID: '9223372037897161699',
          tones: 'G,Bb,Db,E'
        },
        {
          strings: '3 X 3 3 2 X',
          fingering: '2 X 3 4 1 X',
          chordName: 'G,m,7b5,',
          enharmonicChordName: 'G,m,7b5,',
          voicingID: '9223372037897162723',
          tones: 'G,Bb,Db,F'
        },
        {
          strings: '3 X 0 0 0 0',
          fingering: '3 X X X X X',
          chordName: 'G,,6,',
          enharmonicChordName: 'G,,6,',
          voicingID: '9223372036854776803',
          tones: 'G,B,D,E'
        },
        {
          strings: '3 X 2 3 3 X',
          fingering: '2 X 1 3 4 X',
          chordName: 'G,m,6,',
          enharmonicChordName: 'G,m,6,',
          voicingID: '9223372037898210275',
          tones: 'G,Bb,D,E'
        }
      ],
      Ab: [
        {
          strings: '4 6 6 5 4 4',
          fingering: '1 3 4 2 1 1',
          chordName: 'Ab,,,',
          enharmonicChordName: 'G#,,,',
          voicingID: '9223372036993358020',
          tones: 'Ab,C,Eb'
        },
        {
          strings: '4 6 6 4 4 4',
          fingering: '1 3 4 1 1 1',
          chordName: 'Ab,m,,',
          enharmonicChordName: 'G#,m,,',
          voicingID: '9223372036993325252',
          tones: 'G#,B,D#'
        },
        {
          strings: '4 6 4 5 7 4',
          fingering: '1 3 1 2 4 1',
          chordName: 'Ab,,7,',
          enharmonicChordName: 'G#,,7,',
          voicingID: '9223372036996501700',
          tones: 'Ab,C,Eb,Gb'
        },
        {
          strings: '4 X 5 5 4 X',
          fingering: '1 X 3 4 2 X',
          chordName: 'Ab,maj,7,',
          enharmonicChordName: 'G#,maj,7,',
          voicingID: '9223372037899327460',
          tones: 'Ab,C,Eb,G'
        },
        {
          strings: '4 6 4 4 4 4',
          fingering: '1 3 1 1 1 1',
          chordName: 'Ab,m,7,',
          enharmonicChordName: 'G#,m,7,',
          voicingID: '9223372036993323204',
          tones: 'G#,B,D#,F#'
        },
        {
          strings: '4 6 X X X X',
          fingering: '1 3 X X X X',
          chordName: 'Ab,,5,',
          enharmonicChordName: 'G#,,5,',
          voicingID: '9223372037928516804',
          tones: 'G#,D#'
        },
        {
          strings: '4 X 3 4 3 X',
          fingering: '2 X 1 4 1 X',
          chordName: 'Ab,dim,7,',
          enharmonicChordName: 'G#,dim,7,',
          voicingID: '9223372037898244068',
          tones: 'G#,B,D,F'
        },
        {
          strings: '4 X 4 4 3 X',
          fingering: '2 X 3 4 1 X',
          chordName: 'Ab,m,7b5,',
          enharmonicChordName: 'G#,m,7b5,',
          voicingID: '9223372037898245092',
          tones: 'G#,B,D,F#'
        },
        {
          strings: '4 X 3 5 4 X',
          fingering: '2 X 1 4 3 X',
          chordName: 'Ab,,6,',
          enharmonicChordName: 'G#,,6,',
          voicingID: '9223372037899325412',
          tones: 'Ab,C,Eb,F'
        },
        {
          strings: '4 X 3 4 4 X',
          fingering: '2 X 1 3 4 X',
          chordName: 'Ab,m,6,',
          enharmonicChordName: 'G#,m,6,',
          voicingID: '9223372037899292644',
          tones: 'G#,B,D#,F'
        }
      ],
      A: [
        {
          strings: 'X 0 2 2 2 0',
          fingering: 'X X 2 3 4 X',
          chordName: 'A,,,',
          enharmonicChordName: 'A,,,',
          voicingID: '9223372036856940575',
          tones: 'A,C#,E'
        },
        {
          strings: 'X 0 2 2 1 0',
          fingering: 'X X 2 3 1 X',
          chordName: 'A,m,,',
          enharmonicChordName: 'A,m,,',
          voicingID: '9223372036855891999',
          tones: 'A,C,E'
        },
        {
          strings: 'X 0 2 0 2 0',
          fingering: 'X X 2 X 3 X',
          chordName: 'A,,7,',
          enharmonicChordName: 'A,,7,',
          voicingID: '9223372036856875039',
          tones: 'A,C#,E,G'
        },
        {
          strings: 'X 0 2 2 2 4',
          fingering: 'X X 1 1 1 3',
          chordName: 'A,maj,7,',
          enharmonicChordName: 'A,maj,7,',
          voicingID: '9223372036991158303',
          tones: 'A,C#,E,G#'
        },
        {
          strings: 'X 0 2 0 1 0',
          fingering: 'X X 2 X 1 X',
          chordName: 'A,m,7,',
          enharmonicChordName: 'A,m,7,',
          voicingID: '9223372036855826463',
          tones: 'A,C,E,G'
        },
        {
          strings: 'X 0 2 X X X',
          fingering: 'X X 2 X X X',
          chordName: 'A,,5,',
          enharmonicChordName: 'A,,5,',
          voicingID: '9223372037928486943',
          tones: 'A,E'
        },
        {
          strings: 'X 0 4 5 4 X',
          fingering: 'X X 1 3 2 X',
          chordName: 'A,dim,7,',
          enharmonicChordName: 'A,dim,7,',
          voicingID: '9223372037899325471',
          tones: 'A,C,Eb,F#'
        },
        {
          strings: 'X 0 1 0 1 X',
          fingering: 'X X 1 X 2 X',
          chordName: 'A,m,7b5,',
          enharmonicChordName: 'A,m,7b5,',
          voicingID: '9223372037896012831',
          tones: 'A,C,Eb,G'
        },
        {
          strings: 'X 0 2 2 2 2',
          fingering: 'X X 1 1 1 1',
          chordName: 'A,,6,',
          enharmonicChordName: 'A,,6,',
          voicingID: '9223372036924049439',
          tones: 'A,C#,E,F#'
        },
        {
          strings: 'X 0 4 5 5 X',
          fingering: 'X X 1 2 3 X',
          chordName: 'A,m,6,',
          enharmonicChordName: 'A,m,6,',
          voicingID: '9223372037900374047',
          tones: 'A,C,E,F#'
        }
      ],
      Bb: [
        {
          strings: 'X 1 3 3 3 1',
          fingering: 'X 1 2 3 4 1',
          chordName: 'Bb,,,',
          enharmonicChordName: 'A#,,,',
          voicingID: '9223372036891577407',
          tones: 'Bb,D,F'
        },
        {
          strings: 'X 1 3 3 2 1',
          fingering: 'X 1 3 4 2 1',
          chordName: 'Bb,m,,',
          enharmonicChordName: 'A#,m,,',
          voicingID: '9223372036890528831',
          tones: 'Bb,Db,F'
        },
        {
          strings: 'X 1 3 1 3 1',
          fingering: 'X 1 3 1 4 1',
          chordName: 'Bb,,7,',
          enharmonicChordName: 'A#,,7,',
          voicingID: '9223372036891511871',
          tones: 'Bb,D,F,Ab'
        },
        {
          strings: 'X 1 3 2 3 1',
          fingering: 'X 1 3 2 4 1',
          chordName: 'Bb,maj,7,',
          enharmonicChordName: 'A#,maj,7,',
          voicingID: '9223372036891544639',
          tones: 'Bb,D,F,A'
        },
        {
          strings: 'X 1 3 1 2 1',
          fingering: 'X 1 3 1 2 1',
          chordName: 'Bb,m,7,',
          enharmonicChordName: 'A#,m,7,',
          voicingID: '9223372036890463295',
          tones: 'Bb,Db,F,Ab'
        },
        {
          strings: 'X 1 3 X X X',
          fingering: 'X 1 3 X X X',
          chordName: 'Bb,,5,',
          enharmonicChordName: 'A#,,5,',
          voicingID: '9223372037928487999',
          tones: 'Bb,F'
        },
        {
          strings: 'X 1 2 0 2 X',
          fingering: 'X 1 2 X 3 X',
          chordName: 'Bb,dim,7,',
          enharmonicChordName: 'A#,dim,7,',
          voicingID: '9223372037897062463',
          tones: 'Bb,Db,E,G'
        },
        {
          strings: 'X 1 2 1 2 X',
          fingering: 'X 1 3 2 4 X',
          chordName: 'Bb,m,7b5,',
          enharmonicChordName: 'A#,m,7b5,',
          voicingID: '9223372037897095231',
          tones: 'Bb,Db,E,Ab'
        },
        {
          strings: 'X 1 3 0 3 X',
          fingering: 'X 1 3 X 4 X',
          chordName: 'Bb,,6,',
          enharmonicChordName: 'A#,,6,',
          voicingID: '9223372037898112063',
          tones: 'Bb,D,F,G'
        },
        {
          strings: 'X 1 3 0 2 X',
          fingering: 'X 1 4 X 3 X',
          chordName: 'Bb,m,6,',
          enharmonicChordName: 'A#,m,6,',
          voicingID: '9223372037897063487',
          tones: 'Bb,Db,F,G'
        }
      ],
      B: [
        {
          strings: 'X 2 4 4 4 2',
          fingering: 'X 1 2 3 4 1',
          chordName: 'B,,,',
          enharmonicChordName: 'B,,,',
          voicingID: '9223372036926214239',
          tones: 'B,D#,F#'
        },
        {
          strings: 'X 2 4 4 3 2',
          fingering: 'X 1 3 4 2 1',
          chordName: 'B,m,,',
          enharmonicChordName: 'B,m,,',
          voicingID: '9223372036925165663',
          tones: 'B,D,F#'
        },
        {
          strings: 'X 2 4 2 4 2',
          fingering: 'X 1 3 1 4 1',
          chordName: 'B,,7,',
          enharmonicChordName: 'B,,7,',
          voicingID: '9223372036926148703',
          tones: 'B,D#,F#,A'
        },
        {
          strings: 'X 2 4 3 4 2',
          fingering: 'X 1 3 2 4 1',
          chordName: 'B,maj,7,',
          enharmonicChordName: 'B,maj,7,',
          voicingID: '9223372036926181471',
          tones: 'B,D#,F#,A#'
        },
        {
          strings: 'X 2 0 2 0 2',
          fingering: 'X 2 X 3 X 4',
          chordName: 'B,m,7,',
          enharmonicChordName: 'B,m,7,',
          voicingID: '9223372036921950303',
          tones: 'B,D,F#,A'
        },
        {
          strings: 'X 2 4 X X X',
          fingering: 'X 1 3 X X X',
          chordName: 'B,,5,',
          enharmonicChordName: 'B,,5,',
          voicingID: '9223372037928489055',
          tones: 'B,F#'
        },
        {
          strings: 'X 2 3 1 3 X',
          fingering: 'X 2 3 1 4 X',
          chordName: 'B,dim,7,',
          enharmonicChordName: 'B,dim,7,',
          voicingID: '9223372037898144863',
          tones: 'B,D,F,G#'
        },
        {
          strings: 'X 2 3 2 3 X',
          fingering: 'X 1 3 2 4 X',
          chordName: 'B,m,7b5,',
          enharmonicChordName: 'B,m,7b5,',
          voicingID: '9223372037898177631',
          tones: 'B,D,F,A'
        },
        {
          strings: 'X 2 1 1 0 2',
          fingering: 'X 3 1 2 X 4',
          chordName: 'B,,6,',
          enharmonicChordName: 'B,,6,',
          voicingID: '9223372036921918559',
          tones: 'B,D#,F#,G#'
        },
        {
          strings: 'X 2 4 1 3 X',
          fingering: 'X 2 4 1 3 X',
          chordName: 'B,m,6,',
          enharmonicChordName: 'B,m,6,',
          voicingID: '9223372037898145887',
          tones: 'B,D,F#,G#'
        }
      ]
    };

    let empty_chord = [{
        chordName: '',
        enharmonicChordName: '',
        fingering: 'X X X X X X',
        strings: 'X X X X X X',
        tones: ''
    }];

    function getChords(note) {
        let chords = empty_chord;
        if (note !== '') {
            chords = CHORDS[note];
        }
        return chords;
    }

    const methods = {};
    const names = [];

    function registerMethods (name, m) {
      if (Array.isArray(name)) {
        for (const _name of name) {
          registerMethods(_name, m);
        }
        return
      }

      if (typeof name === 'object') {
        for (const _name in name) {
          registerMethods(_name, name[_name]);
        }
        return
      }

      addMethodNames(Object.getOwnPropertyNames(m));
      methods[name] = Object.assign(methods[name] || {}, m);
    }

    function getMethodsFor (name) {
      return methods[name] || {}
    }

    function getMethodNames () {
      return [ ...new Set(names) ]
    }

    function addMethodNames (_names) {
      names.push(..._names);
    }

    // Map function
    function map (array, block) {
      let i;
      const il = array.length;
      const result = [];

      for (i = 0; i < il; i++) {
        result.push(block(array[i]));
      }

      return result
    }

    // Filter function
    function filter (array, block) {
      let i;
      const il = array.length;
      const result = [];

      for (i = 0; i < il; i++) {
        if (block(array[i])) {
          result.push(array[i]);
        }
      }

      return result
    }

    // Degrees to radians
    function radians (d) {
      return d % 360 * Math.PI / 180
    }

    // Convert dash-separated-string to camelCase
    function camelCase (s) {
      return s.toLowerCase().replace(/-(.)/g, function (m, g) {
        return g.toUpperCase()
      })
    }

    // Convert camel cased string to dash separated
    function unCamelCase (s) {
      return s.replace(/([A-Z])/g, function (m, g) {
        return '-' + g.toLowerCase()
      })
    }

    // Capitalize first letter of a string
    function capitalize (s) {
      return s.charAt(0).toUpperCase() + s.slice(1)
    }

    // Calculate proportional width and height values when necessary
    function proportionalSize (element, width, height, box) {
      if (width == null || height == null) {
        box = box || element.bbox();

        if (width == null) {
          width = box.width / box.height * height;
        } else if (height == null) {
          height = box.height / box.width * width;
        }
      }

      return {
        width: width,
        height: height
      }
    }

    /**
     * This function adds support for string origins.
     * It searches for an origin in o.origin o.ox and o.originX.
     * This way, origin: {x: 'center', y: 50} can be passed as well as ox: 'center', oy: 50
    **/
    function getOrigin (o, element) {
      const origin = o.origin;
      // First check if origin is in ox or originX
      let ox = o.ox != null
        ? o.ox
        : o.originX != null
          ? o.originX
          : 'center';
      let oy = o.oy != null
        ? o.oy
        : o.originY != null
          ? o.originY
          : 'center';

      // Then check if origin was used and overwrite in that case
      if (origin != null) {
        [ ox, oy ] = Array.isArray(origin)
          ? origin
          : typeof origin === 'object'
            ? [ origin.x, origin.y ]
            : [ origin, origin ];
      }

      // Make sure to only call bbox when actually needed
      const condX = typeof ox === 'string';
      const condY = typeof oy === 'string';
      if (condX || condY) {
        const { height, width, x, y } = element.bbox();

        // And only overwrite if string was passed for this specific axis
        if (condX) {
          ox = ox.includes('left')
            ? x
            : ox.includes('right')
              ? x + width
              : x + width / 2;
        }

        if (condY) {
          oy = oy.includes('top')
            ? y
            : oy.includes('bottom')
              ? y + height
              : y + height / 2;
        }
      }

      // Return the origin as it is if it wasn't a string
      return [ ox, oy ]
    }

    // Default namespaces
    const svg = 'http://www.w3.org/2000/svg';
    const html = 'http://www.w3.org/1999/xhtml';
    const xmlns = 'http://www.w3.org/2000/xmlns/';
    const xlink = 'http://www.w3.org/1999/xlink';
    const svgjs = 'http://svgjs.dev/svgjs';

    const globals = {
      window: typeof window === 'undefined' ? null : window,
      document: typeof document === 'undefined' ? null : document
    };

    class Base {
      // constructor (node/*, {extensions = []} */) {
      //   // this.tags = []
      //   //
      //   // for (let extension of extensions) {
      //   //   extension.setup.call(this, node)
      //   //   this.tags.push(extension.name)
      //   // }
      // }
    }

    const elements = {};
    const root = '___SYMBOL___ROOT___';

    // Method for element creation
    function create (name, ns = svg) {
      // create element
      return globals.document.createElementNS(ns, name)
    }

    function makeInstance (element, isHTML = false) {
      if (element instanceof Base) return element

      if (typeof element === 'object') {
        return adopter(element)
      }

      if (element == null) {
        return new elements[root]()
      }

      if (typeof element === 'string' && element.charAt(0) !== '<') {
        return adopter(globals.document.querySelector(element))
      }

      // Make sure, that HTML elements are created with the correct namespace
      const wrapper = isHTML ? globals.document.createElement('div') : create('svg');
      wrapper.innerHTML = element;

      // We can use firstChild here because we know,
      // that the first char is < and thus an element
      element = adopter(wrapper.firstChild);

      // make sure, that element doesnt have its wrapper attached
      wrapper.removeChild(wrapper.firstChild);
      return element
    }

    function nodeOrNew (name, node) {
      return (node && node.ownerDocument && node instanceof node.ownerDocument.defaultView.Node) ? node : create(name)
    }

    // Adopt existing svg elements
    function adopt (node) {
      // check for presence of node
      if (!node) return null

      // make sure a node isn't already adopted
      if (node.instance instanceof Base) return node.instance

      if (node.nodeName === '#document-fragment') {
        return new elements.Fragment(node)
      }

      // initialize variables
      let className = capitalize(node.nodeName || 'Dom');

      // Make sure that gradients are adopted correctly
      if (className === 'LinearGradient' || className === 'RadialGradient') {
        className = 'Gradient';

      // Fallback to Dom if element is not known
      } else if (!elements[className]) {
        className = 'Dom';
      }

      return new elements[className](node)
    }

    let adopter = adopt;

    function register (element, name = element.name, asRoot = false) {
      elements[name] = element;
      if (asRoot) elements[root] = element;

      addMethodNames(Object.getOwnPropertyNames(element.prototype));

      return element
    }

    function getClass (name) {
      return elements[name]
    }

    // Element id sequence
    let did = 1000;

    // Get next named element id
    function eid (name) {
      return 'Svgjs' + capitalize(name) + (did++)
    }

    // Deep new id assignment
    function assignNewId (node) {
      // do the same for SVG child nodes as well
      for (let i = node.children.length - 1; i >= 0; i--) {
        assignNewId(node.children[i]);
      }

      if (node.id) {
        node.id = eid(node.nodeName);
        return node
      }

      return node
    }

    // Method for extending objects
    function extend (modules, methods) {
      let key, i;

      modules = Array.isArray(modules) ? modules : [ modules ];

      for (i = modules.length - 1; i >= 0; i--) {
        for (key in methods) {
          modules[i].prototype[key] = methods[key];
        }
      }
    }

    function wrapWithAttrCheck (fn) {
      return function (...args) {
        const o = args[args.length - 1];

        if (o && o.constructor === Object && !(o instanceof Array)) {
          return fn.apply(this, args.slice(0, -1)).attr(o)
        } else {
          return fn.apply(this, args)
        }
      }
    }

    // Get all siblings, including myself
    function siblings () {
      return this.parent().children()
    }

    // Get the current position siblings
    function position () {
      return this.parent().index(this)
    }

    // Get the next element (will return null if there is none)
    function next () {
      return this.siblings()[this.position() + 1]
    }

    // Get the next element (will return null if there is none)
    function prev () {
      return this.siblings()[this.position() - 1]
    }

    // Send given element one step forward
    function forward () {
      const i = this.position();
      const p = this.parent();

      // move node one step forward
      p.add(this.remove(), i + 1);

      return this
    }

    // Send given element one step backward
    function backward () {
      const i = this.position();
      const p = this.parent();

      p.add(this.remove(), i ? i - 1 : 0);

      return this
    }

    // Send given element all the way to the front
    function front () {
      const p = this.parent();

      // Move node forward
      p.add(this.remove());

      return this
    }

    // Send given element all the way to the back
    function back () {
      const p = this.parent();

      // Move node back
      p.add(this.remove(), 0);

      return this
    }

    // Inserts a given element before the targeted element
    function before (element) {
      element = makeInstance(element);
      element.remove();

      const i = this.position();

      this.parent().add(element, i);

      return this
    }

    // Inserts a given element after the targeted element
    function after (element) {
      element = makeInstance(element);
      element.remove();

      const i = this.position();

      this.parent().add(element, i + 1);

      return this
    }

    function insertBefore (element) {
      element = makeInstance(element);
      element.before(this);
      return this
    }

    function insertAfter (element) {
      element = makeInstance(element);
      element.after(this);
      return this
    }

    registerMethods('Dom', {
      siblings,
      position,
      next,
      prev,
      forward,
      backward,
      front,
      back,
      before,
      after,
      insertBefore,
      insertAfter
    });

    // Parse unit value
    const numberAndUnit = /^([+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?)([a-z%]*)$/i;

    // Parse hex value
    const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

    // Parse rgb value
    const rgb = /rgb\((\d+),(\d+),(\d+)\)/;

    // Parse reference id
    const reference = /(#[a-z_][a-z0-9\-_]*)/i;

    // splits a transformation chain
    const transforms = /\)\s*,?\s*/;

    // Whitespace
    const whitespace = /\s/g;

    // Test hex value
    const isHex = /^#[a-f0-9]{3}$|^#[a-f0-9]{6}$/i;

    // Test rgb value
    const isRgb = /^rgb\(/;

    // Test for blank string
    const isBlank = /^(\s+)?$/;

    // Test for numeric string
    const isNumber = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

    // Test for image url
    const isImage = /\.(jpg|jpeg|png|gif|svg)(\?[^=]+.*)?/i;

    // split at whitespace and comma
    const delimiter = /[\s,]+/;

    // Test for path letter
    const isPathLetter = /[MLHVCSQTAZ]/i;

    // Return array of classes on the node
    function classes () {
      const attr = this.attr('class');
      return attr == null ? [] : attr.trim().split(delimiter)
    }

    // Return true if class exists on the node, false otherwise
    function hasClass (name) {
      return this.classes().indexOf(name) !== -1
    }

    // Add class to the node
    function addClass (name) {
      if (!this.hasClass(name)) {
        const array = this.classes();
        array.push(name);
        this.attr('class', array.join(' '));
      }

      return this
    }

    // Remove class from the node
    function removeClass (name) {
      if (this.hasClass(name)) {
        this.attr('class', this.classes().filter(function (c) {
          return c !== name
        }).join(' '));
      }

      return this
    }

    // Toggle the presence of a class on the node
    function toggleClass (name) {
      return this.hasClass(name) ? this.removeClass(name) : this.addClass(name)
    }

    registerMethods('Dom', {
      classes, hasClass, addClass, removeClass, toggleClass
    });

    // Dynamic style generator
    function css (style, val) {
      const ret = {};
      if (arguments.length === 0) {
        // get full style as object
        this.node.style.cssText.split(/\s*;\s*/)
          .filter(function (el) {
            return !!el.length
          })
          .forEach(function (el) {
            const t = el.split(/\s*:\s*/);
            ret[t[0]] = t[1];
          });
        return ret
      }

      if (arguments.length < 2) {
        // get style properties as array
        if (Array.isArray(style)) {
          for (const name of style) {
            const cased = camelCase(name);
            ret[name] = this.node.style[cased];
          }
          return ret
        }

        // get style for property
        if (typeof style === 'string') {
          return this.node.style[camelCase(style)]
        }

        // set styles in object
        if (typeof style === 'object') {
          for (const name in style) {
            // set empty string if null/undefined/'' was given
            this.node.style[camelCase(name)]
              = (style[name] == null || isBlank.test(style[name])) ? '' : style[name];
          }
        }
      }

      // set style for property
      if (arguments.length === 2) {
        this.node.style[camelCase(style)]
          = (val == null || isBlank.test(val)) ? '' : val;
      }

      return this
    }

    // Show element
    function show () {
      return this.css('display', '')
    }

    // Hide element
    function hide () {
      return this.css('display', 'none')
    }

    // Is element visible?
    function visible () {
      return this.css('display') !== 'none'
    }

    registerMethods('Dom', {
      css, show, hide, visible
    });

    // Store data values on svg nodes
    function data (a, v, r) {
      if (a == null) {
        // get an object of attributes
        return this.data(map(filter(this.node.attributes, (el) => el.nodeName.indexOf('data-') === 0), (el) => el.nodeName.slice(5)))
      } else if (a instanceof Array) {
        const data = {};
        for (const key of a) {
          data[key] = this.data(key);
        }
        return data
      } else if (typeof a === 'object') {
        for (v in a) {
          this.data(v, a[v]);
        }
      } else if (arguments.length < 2) {
        try {
          return JSON.parse(this.attr('data-' + a))
        } catch (e) {
          return this.attr('data-' + a)
        }
      } else {
        this.attr('data-' + a,
          v === null
            ? null
            : r === true || typeof v === 'string' || typeof v === 'number'
              ? v
              : JSON.stringify(v)
        );
      }

      return this
    }

    registerMethods('Dom', { data });

    // Remember arbitrary data
    function remember (k, v) {
      // remember every item in an object individually
      if (typeof arguments[0] === 'object') {
        for (const key in k) {
          this.remember(key, k[key]);
        }
      } else if (arguments.length === 1) {
        // retrieve memory
        return this.memory()[k]
      } else {
        // store memory
        this.memory()[k] = v;
      }

      return this
    }

    // Erase a given memory
    function forget () {
      if (arguments.length === 0) {
        this._memory = {};
      } else {
        for (let i = arguments.length - 1; i >= 0; i--) {
          delete this.memory()[arguments[i]];
        }
      }
      return this
    }

    // This triggers creation of a new hidden class which is not performant
    // However, this function is not rarely used so it will not happen frequently
    // Return local memory object
    function memory () {
      return (this._memory = this._memory || {})
    }

    registerMethods('Dom', { remember, forget, memory });

    function sixDigitHex (hex) {
      return hex.length === 4
        ? [ '#',
          hex.substring(1, 2), hex.substring(1, 2),
          hex.substring(2, 3), hex.substring(2, 3),
          hex.substring(3, 4), hex.substring(3, 4)
        ].join('')
        : hex
    }

    function componentHex (component) {
      const integer = Math.round(component);
      const bounded = Math.max(0, Math.min(255, integer));
      const hex = bounded.toString(16);
      return hex.length === 1 ? '0' + hex : hex
    }

    function is (object, space) {
      for (let i = space.length; i--;) {
        if (object[space[i]] == null) {
          return false
        }
      }
      return true
    }

    function getParameters (a, b) {
      const params = is(a, 'rgb')
        ? { _a: a.r, _b: a.g, _c: a.b, _d: 0, space: 'rgb' }
        : is(a, 'xyz')
          ? { _a: a.x, _b: a.y, _c: a.z, _d: 0, space: 'xyz' }
          : is(a, 'hsl')
            ? { _a: a.h, _b: a.s, _c: a.l, _d: 0, space: 'hsl' }
            : is(a, 'lab')
              ? { _a: a.l, _b: a.a, _c: a.b, _d: 0, space: 'lab' }
              : is(a, 'lch')
                ? { _a: a.l, _b: a.c, _c: a.h, _d: 0, space: 'lch' }
                : is(a, 'cmyk')
                  ? { _a: a.c, _b: a.m, _c: a.y, _d: a.k, space: 'cmyk' }
                  : { _a: 0, _b: 0, _c: 0, space: 'rgb' };

      params.space = b || params.space;
      return params
    }

    function cieSpace (space) {
      if (space === 'lab' || space === 'xyz' || space === 'lch') {
        return true
      } else {
        return false
      }
    }

    function hueToRgb (p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    class Color {
      constructor (...inputs) {
        this.init(...inputs);
      }

      // Test if given value is a color
      static isColor (color) {
        return color && (
          color instanceof Color
          || this.isRgb(color)
          || this.test(color)
        )
      }

      // Test if given value is an rgb object
      static isRgb (color) {
        return color && typeof color.r === 'number'
          && typeof color.g === 'number'
          && typeof color.b === 'number'
      }

      /*
      Generating random colors
      */
      static random (mode = 'vibrant', t, u) {

        // Get the math modules
        const { random, round, sin, PI: pi } = Math;

        // Run the correct generator
        if (mode === 'vibrant') {

          const l = (81 - 57) * random() + 57;
          const c = (83 - 45) * random() + 45;
          const h = 360 * random();
          const color = new Color(l, c, h, 'lch');
          return color

        } else if (mode === 'sine') {

          t = t == null ? random() : t;
          const r = round(80 * sin(2 * pi * t / 0.5 + 0.01) + 150);
          const g = round(50 * sin(2 * pi * t / 0.5 + 4.6) + 200);
          const b = round(100 * sin(2 * pi * t / 0.5 + 2.3) + 150);
          const color = new Color(r, g, b);
          return color

        } else if (mode === 'pastel') {

          const l = (94 - 86) * random() + 86;
          const c = (26 - 9) * random() + 9;
          const h = 360 * random();
          const color = new Color(l, c, h, 'lch');
          return color

        } else if (mode === 'dark') {

          const l = 10 + 10 * random();
          const c = (125 - 75) * random() + 86;
          const h = 360 * random();
          const color = new Color(l, c, h, 'lch');
          return color

        } else if (mode === 'rgb') {

          const r = 255 * random();
          const g = 255 * random();
          const b = 255 * random();
          const color = new Color(r, g, b);
          return color

        } else if (mode === 'lab') {

          const l = 100 * random();
          const a = 256 * random() - 128;
          const b = 256 * random() - 128;
          const color = new Color(l, a, b, 'lab');
          return color

        } else if (mode === 'grey') {

          const grey = 255 * random();
          const color = new Color(grey, grey, grey);
          return color

        } else {

          throw new Error('Unsupported random color mode')

        }
      }

      // Test if given value is a color string
      static test (color) {
        return (typeof color === 'string')
          && (isHex.test(color) || isRgb.test(color))
      }

      cmyk () {

        // Get the rgb values for the current color
        const { _a, _b, _c } = this.rgb();
        const [ r, g, b ] = [ _a, _b, _c ].map(v => v / 255);

        // Get the cmyk values in an unbounded format
        const k = Math.min(1 - r, 1 - g, 1 - b);

        if (k === 1) {
          // Catch the black case
          return new Color(0, 0, 0, 1, 'cmyk')
        }

        const c = (1 - r - k) / (1 - k);
        const m = (1 - g - k) / (1 - k);
        const y = (1 - b - k) / (1 - k);

        // Construct the new color
        const color = new Color(c, m, y, k, 'cmyk');
        return color
      }

      hsl () {

        // Get the rgb values
        const { _a, _b, _c } = this.rgb();
        const [ r, g, b ] = [ _a, _b, _c ].map(v => v / 255);

        // Find the maximum and minimum values to get the lightness
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        // If the r, g, v values are identical then we are grey
        const isGrey = max === min;

        // Calculate the hue and saturation
        const delta = max - min;
        const s = isGrey
          ? 0
          : l > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);
        const h = isGrey
          ? 0
          : max === r
            ? ((g - b) / delta + (g < b ? 6 : 0)) / 6
            : max === g
              ? ((b - r) / delta + 2) / 6
              : max === b
                ? ((r - g) / delta + 4) / 6
                : 0;

        // Construct and return the new color
        const color = new Color(360 * h, 100 * s, 100 * l, 'hsl');
        return color
      }

      init (a = 0, b = 0, c = 0, d = 0, space = 'rgb') {
        // This catches the case when a falsy value is passed like ''
        a = !a ? 0 : a;

        // Reset all values in case the init function is rerun with new color space
        if (this.space) {
          for (const component in this.space) {
            delete this[this.space[component]];
          }
        }

        if (typeof a === 'number') {
          // Allow for the case that we don't need d...
          space = typeof d === 'string' ? d : space;
          d = typeof d === 'string' ? 0 : d;

          // Assign the values straight to the color
          Object.assign(this, { _a: a, _b: b, _c: c, _d: d, space });
        // If the user gave us an array, make the color from it
        } else if (a instanceof Array) {
          this.space = b || (typeof a[3] === 'string' ? a[3] : a[4]) || 'rgb';
          Object.assign(this, { _a: a[0], _b: a[1], _c: a[2], _d: a[3] || 0 });
        } else if (a instanceof Object) {
          // Set the object up and assign its values directly
          const values = getParameters(a, b);
          Object.assign(this, values);
        } else if (typeof a === 'string') {
          if (isRgb.test(a)) {
            const noWhitespace = a.replace(whitespace, '');
            const [ _a, _b, _c ] = rgb.exec(noWhitespace)
              .slice(1, 4).map(v => parseInt(v));
            Object.assign(this, { _a, _b, _c, _d: 0, space: 'rgb' });
          } else if (isHex.test(a)) {
            const hexParse = v => parseInt(v, 16);
            const [ , _a, _b, _c ] = hex.exec(sixDigitHex(a)).map(hexParse);
            Object.assign(this, { _a, _b, _c, _d: 0, space: 'rgb' });
          } else throw Error('Unsupported string format, can\'t construct Color')
        }

        // Now add the components as a convenience
        const { _a, _b, _c, _d } = this;
        const components = this.space === 'rgb'
          ? { r: _a, g: _b, b: _c }
          : this.space === 'xyz'
            ? { x: _a, y: _b, z: _c }
            : this.space === 'hsl'
              ? { h: _a, s: _b, l: _c }
              : this.space === 'lab'
                ? { l: _a, a: _b, b: _c }
                : this.space === 'lch'
                  ? { l: _a, c: _b, h: _c }
                  : this.space === 'cmyk'
                    ? { c: _a, m: _b, y: _c, k: _d }
                    : {};
        Object.assign(this, components);
      }

      lab () {
        // Get the xyz color
        const { x, y, z } = this.xyz();

        // Get the lab components
        const l = (116 * y) - 16;
        const a = 500 * (x - y);
        const b = 200 * (y - z);

        // Construct and return a new color
        const color = new Color(l, a, b, 'lab');
        return color
      }

      lch () {

        // Get the lab color directly
        const { l, a, b } = this.lab();

        // Get the chromaticity and the hue using polar coordinates
        const c = Math.sqrt(a ** 2 + b ** 2);
        let h = 180 * Math.atan2(b, a) / Math.PI;
        if (h < 0) {
          h *= -1;
          h = 360 - h;
        }

        // Make a new color and return it
        const color = new Color(l, c, h, 'lch');
        return color
      }
      /*
      Conversion Methods
      */

      rgb () {
        if (this.space === 'rgb') {
          return this
        } else if (cieSpace(this.space)) {
          // Convert to the xyz color space
          let { x, y, z } = this;
          if (this.space === 'lab' || this.space === 'lch') {
            // Get the values in the lab space
            let { l, a, b } = this;
            if (this.space === 'lch') {
              const { c, h } = this;
              const dToR = Math.PI / 180;
              a = c * Math.cos(dToR * h);
              b = c * Math.sin(dToR * h);
            }

            // Undo the nonlinear function
            const yL = (l + 16) / 116;
            const xL = a / 500 + yL;
            const zL = yL - b / 200;

            // Get the xyz values
            const ct = 16 / 116;
            const mx = 0.008856;
            const nm = 7.787;
            x = 0.95047 * ((xL ** 3 > mx) ? xL ** 3 : (xL - ct) / nm);
            y = 1.00000 * ((yL ** 3 > mx) ? yL ** 3 : (yL - ct) / nm);
            z = 1.08883 * ((zL ** 3 > mx) ? zL ** 3 : (zL - ct) / nm);
          }

          // Convert xyz to unbounded rgb values
          const rU = x * 3.2406 + y * -1.5372 + z * -0.4986;
          const gU = x * -0.9689 + y * 1.8758 + z * 0.0415;
          const bU = x * 0.0557 + y * -0.2040 + z * 1.0570;

          // Convert the values to true rgb values
          const pow = Math.pow;
          const bd = 0.0031308;
          const r = (rU > bd) ? (1.055 * pow(rU, 1 / 2.4) - 0.055) : 12.92 * rU;
          const g = (gU > bd) ? (1.055 * pow(gU, 1 / 2.4) - 0.055) : 12.92 * gU;
          const b = (bU > bd) ? (1.055 * pow(bU, 1 / 2.4) - 0.055) : 12.92 * bU;

          // Make and return the color
          const color = new Color(255 * r, 255 * g, 255 * b);
          return color
        } else if (this.space === 'hsl') {
          // https://bgrins.github.io/TinyColor/docs/tinycolor.html
          // Get the current hsl values
          let { h, s, l } = this;
          h /= 360;
          s /= 100;
          l /= 100;

          // If we are grey, then just make the color directly
          if (s === 0) {
            l *= 255;
            const color = new Color(l, l, l);
            return color
          }

          // TODO I have no idea what this does :D If you figure it out, tell me!
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;

          // Get the rgb values
          const r = 255 * hueToRgb(p, q, h + 1 / 3);
          const g = 255 * hueToRgb(p, q, h);
          const b = 255 * hueToRgb(p, q, h - 1 / 3);

          // Make a new color
          const color = new Color(r, g, b);
          return color
        } else if (this.space === 'cmyk') {
          // https://gist.github.com/felipesabino/5066336
          // Get the normalised cmyk values
          const { c, m, y, k } = this;

          // Get the rgb values
          const r = 255 * (1 - Math.min(1, c * (1 - k) + k));
          const g = 255 * (1 - Math.min(1, m * (1 - k) + k));
          const b = 255 * (1 - Math.min(1, y * (1 - k) + k));

          // Form the color and return it
          const color = new Color(r, g, b);
          return color
        } else {
          return this
        }
      }

      toArray () {
        const { _a, _b, _c, _d, space } = this;
        return [ _a, _b, _c, _d, space ]
      }

      toHex () {
        const [ r, g, b ] = this._clamped().map(componentHex);
        return `#${r}${g}${b}`
      }

      toRgb () {
        const [ rV, gV, bV ] = this._clamped();
        const string = `rgb(${rV},${gV},${bV})`;
        return string
      }

      toString () {
        return this.toHex()
      }

      xyz () {

        // Normalise the red, green and blue values
        const { _a: r255, _b: g255, _c: b255 } = this.rgb();
        const [ r, g, b ] = [ r255, g255, b255 ].map(v => v / 255);

        // Convert to the lab rgb space
        const rL = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        const gL = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        const bL = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        // Convert to the xyz color space without bounding the values
        const xU = (rL * 0.4124 + gL * 0.3576 + bL * 0.1805) / 0.95047;
        const yU = (rL * 0.2126 + gL * 0.7152 + bL * 0.0722) / 1.00000;
        const zU = (rL * 0.0193 + gL * 0.1192 + bL * 0.9505) / 1.08883;

        // Get the proper xyz values by applying the bounding
        const x = (xU > 0.008856) ? Math.pow(xU, 1 / 3) : (7.787 * xU) + 16 / 116;
        const y = (yU > 0.008856) ? Math.pow(yU, 1 / 3) : (7.787 * yU) + 16 / 116;
        const z = (zU > 0.008856) ? Math.pow(zU, 1 / 3) : (7.787 * zU) + 16 / 116;

        // Make and return the color
        const color = new Color(x, y, z, 'xyz');
        return color
      }

      /*
      Input and Output methods
      */

      _clamped () {
        const { _a, _b, _c } = this.rgb();
        const { max, min, round } = Math;
        const format = v => max(0, min(round(v), 255));
        return [ _a, _b, _c ].map(format)
      }

      /*
      Constructing colors
      */

    }

    class Point {
      // Initialize
      constructor (...args) {
        this.init(...args);
      }

      // Clone point
      clone () {
        return new Point(this)
      }

      init (x, y) {
        const base = { x: 0, y: 0 };

        // ensure source as object
        const source = Array.isArray(x)
          ? { x: x[0], y: x[1] }
          : typeof x === 'object'
            ? { x: x.x, y: x.y }
            : { x: x, y: y };

        // merge source
        this.x = source.x == null ? base.x : source.x;
        this.y = source.y == null ? base.y : source.y;

        return this
      }

      toArray () {
        return [ this.x, this.y ]
      }

      transform (m) {
        return this.clone().transformO(m)
      }

      // Transform point with matrix
      transformO (m) {
        if (!Matrix.isMatrixLike(m)) {
          m = new Matrix(m);
        }

        const { x, y } = this;

        // Perform the matrix multiplication
        this.x = m.a * x + m.c * y + m.e;
        this.y = m.b * x + m.d * y + m.f;

        return this
      }

    }

    function point (x, y) {
      return new Point(x, y).transform(this.screenCTM().inverse())
    }

    function closeEnough (a, b, threshold) {
      return Math.abs(b - a) < (threshold || 1e-6)
    }

    class Matrix {
      constructor (...args) {
        this.init(...args);
      }

      static formatTransforms (o) {
        // Get all of the parameters required to form the matrix
        const flipBoth = o.flip === 'both' || o.flip === true;
        const flipX = o.flip && (flipBoth || o.flip === 'x') ? -1 : 1;
        const flipY = o.flip && (flipBoth || o.flip === 'y') ? -1 : 1;
        const skewX = o.skew && o.skew.length
          ? o.skew[0]
          : isFinite(o.skew)
            ? o.skew
            : isFinite(o.skewX)
              ? o.skewX
              : 0;
        const skewY = o.skew && o.skew.length
          ? o.skew[1]
          : isFinite(o.skew)
            ? o.skew
            : isFinite(o.skewY)
              ? o.skewY
              : 0;
        const scaleX = o.scale && o.scale.length
          ? o.scale[0] * flipX
          : isFinite(o.scale)
            ? o.scale * flipX
            : isFinite(o.scaleX)
              ? o.scaleX * flipX
              : flipX;
        const scaleY = o.scale && o.scale.length
          ? o.scale[1] * flipY
          : isFinite(o.scale)
            ? o.scale * flipY
            : isFinite(o.scaleY)
              ? o.scaleY * flipY
              : flipY;
        const shear = o.shear || 0;
        const theta = o.rotate || o.theta || 0;
        const origin = new Point(o.origin || o.around || o.ox || o.originX, o.oy || o.originY);
        const ox = origin.x;
        const oy = origin.y;
        // We need Point to be invalid if nothing was passed because we cannot default to 0 here. Thats why NaN
        const position = new Point(o.position || o.px || o.positionX || NaN, o.py || o.positionY || NaN);
        const px = position.x;
        const py = position.y;
        const translate = new Point(o.translate || o.tx || o.translateX, o.ty || o.translateY);
        const tx = translate.x;
        const ty = translate.y;
        const relative = new Point(o.relative || o.rx || o.relativeX, o.ry || o.relativeY);
        const rx = relative.x;
        const ry = relative.y;

        // Populate all of the values
        return {
          scaleX, scaleY, skewX, skewY, shear, theta, rx, ry, tx, ty, ox, oy, px, py
        }
      }

      static fromArray (a) {
        return { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] }
      }

      static isMatrixLike (o) {
        return (
          o.a != null
          || o.b != null
          || o.c != null
          || o.d != null
          || o.e != null
          || o.f != null
        )
      }

      // left matrix, right matrix, target matrix which is overwritten
      static matrixMultiply (l, r, o) {
        // Work out the product directly
        const a = l.a * r.a + l.c * r.b;
        const b = l.b * r.a + l.d * r.b;
        const c = l.a * r.c + l.c * r.d;
        const d = l.b * r.c + l.d * r.d;
        const e = l.e + l.a * r.e + l.c * r.f;
        const f = l.f + l.b * r.e + l.d * r.f;

        // make sure to use local variables because l/r and o could be the same
        o.a = a;
        o.b = b;
        o.c = c;
        o.d = d;
        o.e = e;
        o.f = f;

        return o
      }

      around (cx, cy, matrix) {
        return this.clone().aroundO(cx, cy, matrix)
      }

      // Transform around a center point
      aroundO (cx, cy, matrix) {
        const dx = cx || 0;
        const dy = cy || 0;
        return this.translateO(-dx, -dy).lmultiplyO(matrix).translateO(dx, dy)
      }

      // Clones this matrix
      clone () {
        return new Matrix(this)
      }

      // Decomposes this matrix into its affine parameters
      decompose (cx = 0, cy = 0) {
        // Get the parameters from the matrix
        const a = this.a;
        const b = this.b;
        const c = this.c;
        const d = this.d;
        const e = this.e;
        const f = this.f;

        // Figure out if the winding direction is clockwise or counterclockwise
        const determinant = a * d - b * c;
        const ccw = determinant > 0 ? 1 : -1;

        // Since we only shear in x, we can use the x basis to get the x scale
        // and the rotation of the resulting matrix
        const sx = ccw * Math.sqrt(a * a + b * b);
        const thetaRad = Math.atan2(ccw * b, ccw * a);
        const theta = 180 / Math.PI * thetaRad;
        const ct = Math.cos(thetaRad);
        const st = Math.sin(thetaRad);

        // We can then solve the y basis vector simultaneously to get the other
        // two affine parameters directly from these parameters
        const lam = (a * c + b * d) / determinant;
        const sy = ((c * sx) / (lam * a - b)) || ((d * sx) / (lam * b + a));

        // Use the translations
        const tx = e - cx + cx * ct * sx + cy * (lam * ct * sx - st * sy);
        const ty = f - cy + cx * st * sx + cy * (lam * st * sx + ct * sy);

        // Construct the decomposition and return it
        return {
          // Return the affine parameters
          scaleX: sx,
          scaleY: sy,
          shear: lam,
          rotate: theta,
          translateX: tx,
          translateY: ty,
          originX: cx,
          originY: cy,

          // Return the matrix parameters
          a: this.a,
          b: this.b,
          c: this.c,
          d: this.d,
          e: this.e,
          f: this.f
        }
      }

      // Check if two matrices are equal
      equals (other) {
        if (other === this) return true
        const comp = new Matrix(other);
        return closeEnough(this.a, comp.a) && closeEnough(this.b, comp.b)
          && closeEnough(this.c, comp.c) && closeEnough(this.d, comp.d)
          && closeEnough(this.e, comp.e) && closeEnough(this.f, comp.f)
      }

      // Flip matrix on x or y, at a given offset
      flip (axis, around) {
        return this.clone().flipO(axis, around)
      }

      flipO (axis, around) {
        return axis === 'x'
          ? this.scaleO(-1, 1, around, 0)
          : axis === 'y'
            ? this.scaleO(1, -1, 0, around)
            : this.scaleO(-1, -1, axis, around || axis) // Define an x, y flip point
      }

      // Initialize
      init (source) {
        const base = Matrix.fromArray([ 1, 0, 0, 1, 0, 0 ]);

        // ensure source as object
        source = source instanceof Element
          ? source.matrixify()
          : typeof source === 'string'
            ? Matrix.fromArray(source.split(delimiter).map(parseFloat))
            : Array.isArray(source)
              ? Matrix.fromArray(source)
              : (typeof source === 'object' && Matrix.isMatrixLike(source))
                ? source
                : (typeof source === 'object')
                  ? new Matrix().transform(source)
                  : arguments.length === 6
                    ? Matrix.fromArray([].slice.call(arguments))
                    : base;

        // Merge the source matrix with the base matrix
        this.a = source.a != null ? source.a : base.a;
        this.b = source.b != null ? source.b : base.b;
        this.c = source.c != null ? source.c : base.c;
        this.d = source.d != null ? source.d : base.d;
        this.e = source.e != null ? source.e : base.e;
        this.f = source.f != null ? source.f : base.f;

        return this
      }

      inverse () {
        return this.clone().inverseO()
      }

      // Inverses matrix
      inverseO () {
        // Get the current parameters out of the matrix
        const a = this.a;
        const b = this.b;
        const c = this.c;
        const d = this.d;
        const e = this.e;
        const f = this.f;

        // Invert the 2x2 matrix in the top left
        const det = a * d - b * c;
        if (!det) throw new Error('Cannot invert ' + this)

        // Calculate the top 2x2 matrix
        const na = d / det;
        const nb = -b / det;
        const nc = -c / det;
        const nd = a / det;

        // Apply the inverted matrix to the top right
        const ne = -(na * e + nc * f);
        const nf = -(nb * e + nd * f);

        // Construct the inverted matrix
        this.a = na;
        this.b = nb;
        this.c = nc;
        this.d = nd;
        this.e = ne;
        this.f = nf;

        return this
      }

      lmultiply (matrix) {
        return this.clone().lmultiplyO(matrix)
      }

      lmultiplyO (matrix) {
        const r = this;
        const l = matrix instanceof Matrix
          ? matrix
          : new Matrix(matrix);

        return Matrix.matrixMultiply(l, r, this)
      }

      // Left multiplies by the given matrix
      multiply (matrix) {
        return this.clone().multiplyO(matrix)
      }

      multiplyO (matrix) {
        // Get the matrices
        const l = this;
        const r = matrix instanceof Matrix
          ? matrix
          : new Matrix(matrix);

        return Matrix.matrixMultiply(l, r, this)
      }

      // Rotate matrix
      rotate (r, cx, cy) {
        return this.clone().rotateO(r, cx, cy)
      }

      rotateO (r, cx = 0, cy = 0) {
        // Convert degrees to radians
        r = radians(r);

        const cos = Math.cos(r);
        const sin = Math.sin(r);

        const { a, b, c, d, e, f } = this;

        this.a = a * cos - b * sin;
        this.b = b * cos + a * sin;
        this.c = c * cos - d * sin;
        this.d = d * cos + c * sin;
        this.e = e * cos - f * sin + cy * sin - cx * cos + cx;
        this.f = f * cos + e * sin - cx * sin - cy * cos + cy;

        return this
      }

      // Scale matrix
      scale (x, y, cx, cy) {
        return this.clone().scaleO(...arguments)
      }

      scaleO (x, y = x, cx = 0, cy = 0) {
        // Support uniform scaling
        if (arguments.length === 3) {
          cy = cx;
          cx = y;
          y = x;
        }

        const { a, b, c, d, e, f } = this;

        this.a = a * x;
        this.b = b * y;
        this.c = c * x;
        this.d = d * y;
        this.e = e * x - cx * x + cx;
        this.f = f * y - cy * y + cy;

        return this
      }

      // Shear matrix
      shear (a, cx, cy) {
        return this.clone().shearO(a, cx, cy)
      }

      shearO (lx, cx = 0, cy = 0) {
        const { a, b, c, d, e, f } = this;

        this.a = a + b * lx;
        this.c = c + d * lx;
        this.e = e + f * lx - cy * lx;

        return this
      }

      // Skew Matrix
      skew (x, y, cx, cy) {
        return this.clone().skewO(...arguments)
      }

      skewO (x, y = x, cx = 0, cy = 0) {
        // support uniformal skew
        if (arguments.length === 3) {
          cy = cx;
          cx = y;
          y = x;
        }

        // Convert degrees to radians
        x = radians(x);
        y = radians(y);

        const lx = Math.tan(x);
        const ly = Math.tan(y);

        const { a, b, c, d, e, f } = this;

        this.a = a + b * lx;
        this.b = b + a * ly;
        this.c = c + d * lx;
        this.d = d + c * ly;
        this.e = e + f * lx - cy * lx;
        this.f = f + e * ly - cx * ly;

        return this
      }

      // SkewX
      skewX (x, cx, cy) {
        return this.skew(x, 0, cx, cy)
      }

      // SkewY
      skewY (y, cx, cy) {
        return this.skew(0, y, cx, cy)
      }

      toArray () {
        return [ this.a, this.b, this.c, this.d, this.e, this.f ]
      }

      // Convert matrix to string
      toString () {
        return 'matrix(' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f + ')'
      }

      // Transform a matrix into another matrix by manipulating the space
      transform (o) {
        // Check if o is a matrix and then left multiply it directly
        if (Matrix.isMatrixLike(o)) {
          const matrix = new Matrix(o);
          return matrix.multiplyO(this)
        }

        // Get the proposed transformations and the current transformations
        const t = Matrix.formatTransforms(o);
        const current = this;
        const { x: ox, y: oy } = new Point(t.ox, t.oy).transform(current);

        // Construct the resulting matrix
        const transformer = new Matrix()
          .translateO(t.rx, t.ry)
          .lmultiplyO(current)
          .translateO(-ox, -oy)
          .scaleO(t.scaleX, t.scaleY)
          .skewO(t.skewX, t.skewY)
          .shearO(t.shear)
          .rotateO(t.theta)
          .translateO(ox, oy);

        // If we want the origin at a particular place, we force it there
        if (isFinite(t.px) || isFinite(t.py)) {
          const origin = new Point(ox, oy).transform(transformer);
          // TODO: Replace t.px with isFinite(t.px)
          // Doesnt work because t.px is also 0 if it wasnt passed
          const dx = isFinite(t.px) ? t.px - origin.x : 0;
          const dy = isFinite(t.py) ? t.py - origin.y : 0;
          transformer.translateO(dx, dy);
        }

        // Translate now after positioning
        transformer.translateO(t.tx, t.ty);
        return transformer
      }

      // Translate matrix
      translate (x, y) {
        return this.clone().translateO(x, y)
      }

      translateO (x, y) {
        this.e += x || 0;
        this.f += y || 0;
        return this
      }

      valueOf () {
        return {
          a: this.a,
          b: this.b,
          c: this.c,
          d: this.d,
          e: this.e,
          f: this.f
        }
      }

    }

    function ctm () {
      return new Matrix(this.node.getCTM())
    }

    function screenCTM () {
      /* https://bugzilla.mozilla.org/show_bug.cgi?id=1344537
         This is needed because FF does not return the transformation matrix
         for the inner coordinate system when getScreenCTM() is called on nested svgs.
         However all other Browsers do that */
      if (typeof this.isRoot === 'function' && !this.isRoot()) {
        const rect = this.rect(1, 1);
        const m = rect.node.getScreenCTM();
        rect.remove();
        return new Matrix(m)
      }
      return new Matrix(this.node.getScreenCTM())
    }

    register(Matrix, 'Matrix');

    function parser () {
      // Reuse cached element if possible
      if (!parser.nodes) {
        const svg = makeInstance().size(2, 0);
        svg.node.style.cssText = [
          'opacity: 0',
          'position: absolute',
          'left: -100%',
          'top: -100%',
          'overflow: hidden'
        ].join(';');

        svg.attr('focusable', 'false');
        svg.attr('aria-hidden', 'true');

        const path = svg.path().node;

        parser.nodes = { svg, path };
      }

      if (!parser.nodes.svg.node.parentNode) {
        const b = globals.document.body || globals.document.documentElement;
        parser.nodes.svg.addTo(b);
      }

      return parser.nodes
    }

    function isNulledBox (box) {
      return !box.width && !box.height && !box.x && !box.y
    }

    function domContains (node) {
      return node === globals.document
        || (globals.document.documentElement.contains || function (node) {
          // This is IE - it does not support contains() for top-level SVGs
          while (node.parentNode) {
            node = node.parentNode;
          }
          return node === globals.document
        }).call(globals.document.documentElement, node)
    }

    class Box {
      constructor (...args) {
        this.init(...args);
      }

      addOffset () {
        // offset by window scroll position, because getBoundingClientRect changes when window is scrolled
        this.x += globals.window.pageXOffset;
        this.y += globals.window.pageYOffset;
        return new Box(this)
      }

      init (source) {
        const base = [ 0, 0, 0, 0 ];
        source = typeof source === 'string'
          ? source.split(delimiter).map(parseFloat)
          : Array.isArray(source)
            ? source
            : typeof source === 'object'
              ? [ source.left != null
                ? source.left
                : source.x, source.top != null ? source.top : source.y, source.width, source.height ]
              : arguments.length === 4
                ? [].slice.call(arguments)
                : base;

        this.x = source[0] || 0;
        this.y = source[1] || 0;
        this.width = this.w = source[2] || 0;
        this.height = this.h = source[3] || 0;

        // Add more bounding box properties
        this.x2 = this.x + this.w;
        this.y2 = this.y + this.h;
        this.cx = this.x + this.w / 2;
        this.cy = this.y + this.h / 2;

        return this
      }

      isNulled () {
        return isNulledBox(this)
      }

      // Merge rect box with another, return a new instance
      merge (box) {
        const x = Math.min(this.x, box.x);
        const y = Math.min(this.y, box.y);
        const width = Math.max(this.x + this.width, box.x + box.width) - x;
        const height = Math.max(this.y + this.height, box.y + box.height) - y;

        return new Box(x, y, width, height)
      }

      toArray () {
        return [ this.x, this.y, this.width, this.height ]
      }

      toString () {
        return this.x + ' ' + this.y + ' ' + this.width + ' ' + this.height
      }

      transform (m) {
        if (!(m instanceof Matrix)) {
          m = new Matrix(m);
        }

        let xMin = Infinity;
        let xMax = -Infinity;
        let yMin = Infinity;
        let yMax = -Infinity;

        const pts = [
          new Point(this.x, this.y),
          new Point(this.x2, this.y),
          new Point(this.x, this.y2),
          new Point(this.x2, this.y2)
        ];

        pts.forEach(function (p) {
          p = p.transform(m);
          xMin = Math.min(xMin, p.x);
          xMax = Math.max(xMax, p.x);
          yMin = Math.min(yMin, p.y);
          yMax = Math.max(yMax, p.y);
        });

        return new Box(
          xMin, yMin,
          xMax - xMin,
          yMax - yMin
        )
      }

    }

    function getBox (el, getBBoxFn, retry) {
      let box;

      try {
        // Try to get the box with the provided function
        box = getBBoxFn(el.node);

        // If the box is worthless and not even in the dom, retry
        // by throwing an error here...
        if (isNulledBox(box) && !domContains(el.node)) {
          throw new Error('Element not in the dom')
        }
      } catch (e) {
        // ... and calling the retry handler here
        box = retry(el);
      }

      return box
    }

    function bbox () {
      // Function to get bbox is getBBox()
      const getBBox = (node) => node.getBBox();

      // Take all measures so that a stupid browser renders the element
      // so we can get the bbox from it when we try again
      const retry = (el) => {
        try {
          const clone = el.clone().addTo(parser().svg).show();
          const box = clone.node.getBBox();
          clone.remove();
          return box
        } catch (e) {
          // We give up...
          throw new Error(`Getting bbox of element "${el.node.nodeName}" is not possible: ${e.toString()}`)
        }
      };

      const box = getBox(this, getBBox, retry);
      const bbox = new Box(box);

      return bbox
    }

    function rbox (el) {
      const getRBox = (node) => node.getBoundingClientRect();
      const retry = (el) => {
        // There is no point in trying tricks here because if we insert the element into the dom ourselves
        // it obviously will be at the wrong position
        throw new Error(`Getting rbox of element "${el.node.nodeName}" is not possible`)
      };

      const box = getBox(this, getRBox, retry);
      const rbox = new Box(box);

      // If an element was passed, we want the bbox in the coordinate system of that element
      if (el) {
        return rbox.transform(el.screenCTM().inverseO())
      }

      // Else we want it in absolute screen coordinates
      // Therefore we need to add the scrollOffset
      return rbox.addOffset()
    }

    // Checks whether the given point is inside the bounding box
    function inside (x, y) {
      const box = this.bbox();

      return x > box.x
        && y > box.y
        && x < box.x + box.width
        && y < box.y + box.height
    }

    registerMethods({
      viewbox: {
        viewbox (x, y, width, height) {
          // act as getter
          if (x == null) return new Box(this.attr('viewBox'))

          // act as setter
          return this.attr('viewBox', new Box(x, y, width, height))
        },

        zoom (level, point) {
          // Its best to rely on the attributes here and here is why:
          // clientXYZ: Doesn't work on non-root svgs because they dont have a CSSBox (silly!)
          // getBoundingClientRect: Doesn't work because Chrome just ignores width and height of nested svgs completely
          //                        that means, their clientRect is always as big as the content.
          //                        Furthermore this size is incorrect if the element is further transformed by its parents
          // computedStyle: Only returns meaningful values if css was used with px. We dont go this route here!
          // getBBox: returns the bounding box of its content - that doesnt help!
          let { width, height } = this.attr([ 'width', 'height' ]);

          // Width and height is a string when a number with a unit is present which we can't use
          // So we try clientXYZ
          if ((!width && !height) || (typeof width === 'string' || typeof height === 'string')) {
            width = this.node.clientWidth;
            height = this.node.clientHeight;
          }

          // Giving up...
          if (!width || !height) {
            throw new Error('Impossible to get absolute width and height. Please provide an absolute width and height attribute on the zooming element')
          }

          const v = this.viewbox();

          const zoomX = width / v.width;
          const zoomY = height / v.height;
          const zoom = Math.min(zoomX, zoomY);

          if (level == null) {
            return zoom
          }

          let zoomAmount = zoom / level;

          // Set the zoomAmount to the highest value which is safe to process and recover from
          // The * 100 is a bit of wiggle room for the matrix transformation
          if (zoomAmount === Infinity) zoomAmount = Number.MAX_SAFE_INTEGER / 100;

          point = point || new Point(width / 2 / zoomX + v.x, height / 2 / zoomY + v.y);

          const box = new Box(v).transform(
            new Matrix({ scale: zoomAmount, origin: point })
          );

          return this.viewbox(box)
        }
      }
    });

    register(Box, 'Box');

    // import { subClassArray } from './ArrayPolyfill.js'

    class List extends Array {
      constructor (arr = [], ...args) {
        super(arr, ...args);
        if (typeof arr === 'number') return this
        this.length = 0;
        this.push(...arr);
      }
    }

    extend([ List ], {
      each (fnOrMethodName, ...args) {
        if (typeof fnOrMethodName === 'function') {
          return this.map((el, i, arr) => {
            return fnOrMethodName.call(el, el, i, arr)
          })
        } else {
          return this.map(el => {
            return el[fnOrMethodName](...args)
          })
        }
      },

      toArray () {
        return Array.prototype.concat.apply([], this)
      }
    });

    const reserved = [ 'toArray', 'constructor', 'each' ];

    List.extend = function (methods) {
      methods = methods.reduce((obj, name) => {
        // Don't overwrite own methods
        if (reserved.includes(name)) return obj

        // Don't add private methods
        if (name[0] === '_') return obj

        // Relay every call to each()
        obj[name] = function (...attrs) {
          return this.each(name, ...attrs)
        };
        return obj
      }, {});

      extend([ List ], methods);
    };

    function baseFind (query, parent) {
      return new List(map((parent || globals.document).querySelectorAll(query), function (node) {
        return adopt(node)
      }))
    }

    // Scoped find method
    function find (query) {
      return baseFind(query, this.node)
    }

    function findOne (query) {
      return adopt(this.node.querySelector(query))
    }

    let listenerId = 0;
    const windowEvents = {};

    function getEvents (instance) {
      let n = instance.getEventHolder();

      // We dont want to save events in global space
      if (n === globals.window) n = windowEvents;
      if (!n.events) n.events = {};
      return n.events
    }

    function getEventTarget (instance) {
      return instance.getEventTarget()
    }

    function clearEvents (instance) {
      let n = instance.getEventHolder();
      if (n === globals.window) n = windowEvents;
      if (n.events) n.events = {};
    }

    // Add event binder in the SVG namespace
    function on (node, events, listener, binding, options) {
      const l = listener.bind(binding || node);
      const instance = makeInstance(node);
      const bag = getEvents(instance);
      const n = getEventTarget(instance);

      // events can be an array of events or a string of events
      events = Array.isArray(events) ? events : events.split(delimiter);

      // add id to listener
      if (!listener._svgjsListenerId) {
        listener._svgjsListenerId = ++listenerId;
      }

      events.forEach(function (event) {
        const ev = event.split('.')[0];
        const ns = event.split('.')[1] || '*';

        // ensure valid object
        bag[ev] = bag[ev] || {};
        bag[ev][ns] = bag[ev][ns] || {};

        // reference listener
        bag[ev][ns][listener._svgjsListenerId] = l;

        // add listener
        n.addEventListener(ev, l, options || false);
      });
    }

    // Add event unbinder in the SVG namespace
    function off (node, events, listener, options) {
      const instance = makeInstance(node);
      const bag = getEvents(instance);
      const n = getEventTarget(instance);

      // listener can be a function or a number
      if (typeof listener === 'function') {
        listener = listener._svgjsListenerId;
        if (!listener) return
      }

      // events can be an array of events or a string or undefined
      events = Array.isArray(events) ? events : (events || '').split(delimiter);

      events.forEach(function (event) {
        const ev = event && event.split('.')[0];
        const ns = event && event.split('.')[1];
        let namespace, l;

        if (listener) {
          // remove listener reference
          if (bag[ev] && bag[ev][ns || '*']) {
            // removeListener
            n.removeEventListener(ev, bag[ev][ns || '*'][listener], options || false);

            delete bag[ev][ns || '*'][listener];
          }
        } else if (ev && ns) {
          // remove all listeners for a namespaced event
          if (bag[ev] && bag[ev][ns]) {
            for (l in bag[ev][ns]) {
              off(n, [ ev, ns ].join('.'), l);
            }

            delete bag[ev][ns];
          }
        } else if (ns) {
          // remove all listeners for a specific namespace
          for (event in bag) {
            for (namespace in bag[event]) {
              if (ns === namespace) {
                off(n, [ event, ns ].join('.'));
              }
            }
          }
        } else if (ev) {
          // remove all listeners for the event
          if (bag[ev]) {
            for (namespace in bag[ev]) {
              off(n, [ ev, namespace ].join('.'));
            }

            delete bag[ev];
          }
        } else {
          // remove all listeners on a given node
          for (event in bag) {
            off(n, event);
          }

          clearEvents(instance);
        }
      });
    }

    function dispatch (node, event, data, options) {
      const n = getEventTarget(node);

      // Dispatch event
      if (event instanceof globals.window.Event) {
        n.dispatchEvent(event);
      } else {
        event = new globals.window.CustomEvent(event, { detail: data, cancelable: true, ...options });
        n.dispatchEvent(event);
      }
      return event
    }

    class EventTarget extends Base {
      addEventListener () {}

      dispatch (event, data, options) {
        return dispatch(this, event, data, options)
      }

      dispatchEvent (event) {
        const bag = this.getEventHolder().events;
        if (!bag) return true

        const events = bag[event.type];

        for (const i in events) {
          for (const j in events[i]) {
            events[i][j](event);
          }
        }

        return !event.defaultPrevented
      }

      // Fire given event
      fire (event, data, options) {
        this.dispatch(event, data, options);
        return this
      }

      getEventHolder () {
        return this
      }

      getEventTarget () {
        return this
      }

      // Unbind event from listener
      off (event, listener, options) {
        off(this, event, listener, options);
        return this
      }

      // Bind given event to listener
      on (event, listener, binding, options) {
        on(this, event, listener, binding, options);
        return this
      }

      removeEventListener () {}
    }

    register(EventTarget, 'EventTarget');

    function noop$1 () {}

    // Default animation values
    const timeline = {
      duration: 400,
      ease: '>',
      delay: 0
    };

    // Default attribute values
    const attrs = {

      // fill and stroke
      'fill-opacity': 1,
      'stroke-opacity': 1,
      'stroke-width': 0,
      'stroke-linejoin': 'miter',
      'stroke-linecap': 'butt',
      fill: '#000000',
      stroke: '#000000',
      opacity: 1,

      // position
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,

      // size
      width: 0,
      height: 0,

      // radius
      r: 0,
      rx: 0,
      ry: 0,

      // gradient
      offset: 0,
      'stop-opacity': 1,
      'stop-color': '#000000',

      // text
      'text-anchor': 'start'
    };

    class SVGArray extends Array {
      constructor (...args) {
        super(...args);
        this.init(...args);
      }

      clone () {
        return new this.constructor(this)
      }

      init (arr) {
        // This catches the case, that native map tries to create an array with new Array(1)
        if (typeof arr === 'number') return this
        this.length = 0;
        this.push(...this.parse(arr));
        return this
      }

      // Parse whitespace separated string
      parse (array = []) {
        // If already is an array, no need to parse it
        if (array instanceof Array) return array

        return array.trim().split(delimiter).map(parseFloat)
      }

      toArray () {
        return Array.prototype.concat.apply([], this)
      }

      toSet () {
        return new Set(this)
      }

      toString () {
        return this.join(' ')
      }

      // Flattens the array if needed
      valueOf () {
        const ret = [];
        ret.push(...this);
        return ret
      }

    }

    // Module for unit conversions
    class SVGNumber {
      // Initialize
      constructor (...args) {
        this.init(...args);
      }

      convert (unit) {
        return new SVGNumber(this.value, unit)
      }

      // Divide number
      divide (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this / number, this.unit || number.unit)
      }

      init (value, unit) {
        unit = Array.isArray(value) ? value[1] : unit;
        value = Array.isArray(value) ? value[0] : value;

        // initialize defaults
        this.value = 0;
        this.unit = unit || '';

        // parse value
        if (typeof value === 'number') {
          // ensure a valid numeric value
          this.value = isNaN(value) ? 0 : !isFinite(value) ? (value < 0 ? -3.4e+38 : +3.4e+38) : value;
        } else if (typeof value === 'string') {
          unit = value.match(numberAndUnit);

          if (unit) {
            // make value numeric
            this.value = parseFloat(unit[1]);

            // normalize
            if (unit[5] === '%') {
              this.value /= 100;
            } else if (unit[5] === 's') {
              this.value *= 1000;
            }

            // store unit
            this.unit = unit[5];
          }
        } else {
          if (value instanceof SVGNumber) {
            this.value = value.valueOf();
            this.unit = value.unit;
          }
        }

        return this
      }

      // Subtract number
      minus (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this - number, this.unit || number.unit)
      }

      // Add number
      plus (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this + number, this.unit || number.unit)
      }

      // Multiply number
      times (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this * number, this.unit || number.unit)
      }

      toArray () {
        return [ this.value, this.unit ]
      }

      toJSON () {
        return this.toString()
      }

      toString () {
        return (this.unit === '%'
          ? ~~(this.value * 1e8) / 1e6
          : this.unit === 's'
            ? this.value / 1e3
            : this.value
        ) + this.unit
      }

      valueOf () {
        return this.value
      }

    }

    const hooks = [];
    function registerAttrHook (fn) {
      hooks.push(fn);
    }

    // Set svg element attribute
    function attr$1 (attr, val, ns) {
      // act as full getter
      if (attr == null) {
        // get an object of attributes
        attr = {};
        val = this.node.attributes;

        for (const node of val) {
          attr[node.nodeName] = isNumber.test(node.nodeValue)
            ? parseFloat(node.nodeValue)
            : node.nodeValue;
        }

        return attr
      } else if (attr instanceof Array) {
        // loop through array and get all values
        return attr.reduce((last, curr) => {
          last[curr] = this.attr(curr);
          return last
        }, {})
      } else if (typeof attr === 'object' && attr.constructor === Object) {
        // apply every attribute individually if an object is passed
        for (val in attr) this.attr(val, attr[val]);
      } else if (val === null) {
        // remove value
        this.node.removeAttribute(attr);
      } else if (val == null) {
        // act as a getter if the first and only argument is not an object
        val = this.node.getAttribute(attr);
        return val == null
          ? attrs[attr]
          : isNumber.test(val)
            ? parseFloat(val)
            : val
      } else {
        // Loop through hooks and execute them to convert value
        val = hooks.reduce((_val, hook) => {
          return hook(attr, _val, this)
        }, val);

        // ensure correct numeric values (also accepts NaN and Infinity)
        if (typeof val === 'number') {
          val = new SVGNumber(val);
        } else if (Color.isColor(val)) {
          // ensure full hex color
          val = new Color(val);
        } else if (val.constructor === Array) {
          // Check for plain arrays and parse array values
          val = new SVGArray(val);
        }

        // if the passed attribute is leading...
        if (attr === 'leading') {
          // ... call the leading method instead
          if (this.leading) {
            this.leading(val);
          }
        } else {
          // set given attribute on node
          typeof ns === 'string'
            ? this.node.setAttributeNS(ns, attr, val.toString())
            : this.node.setAttribute(attr, val.toString());
        }

        // rebuild if required
        if (this.rebuild && (attr === 'font-size' || attr === 'x')) {
          this.rebuild();
        }
      }

      return this
    }

    class Dom extends EventTarget {
      constructor (node, attrs) {
        super();
        this.node = node;
        this.type = node.nodeName;

        if (attrs && node !== attrs) {
          this.attr(attrs);
        }
      }

      // Add given element at a position
      add (element, i) {
        element = makeInstance(element);

        // If non-root svg nodes are added we have to remove their namespaces
        if (element.removeNamespace && this.node instanceof globals.window.SVGElement) {
          element.removeNamespace();
        }

        if (i == null) {
          this.node.appendChild(element.node);
        } else if (element.node !== this.node.childNodes[i]) {
          this.node.insertBefore(element.node, this.node.childNodes[i]);
        }

        return this
      }

      // Add element to given container and return self
      addTo (parent, i) {
        return makeInstance(parent).put(this, i)
      }

      // Returns all child elements
      children () {
        return new List(map(this.node.children, function (node) {
          return adopt(node)
        }))
      }

      // Remove all elements in this container
      clear () {
        // remove children
        while (this.node.hasChildNodes()) {
          this.node.removeChild(this.node.lastChild);
        }

        return this
      }

      // Clone element
      clone (deep = true) {
        // write dom data to the dom so the clone can pickup the data
        this.writeDataToDom();

        // clone element and assign new id
        return new this.constructor(assignNewId(this.node.cloneNode(deep)))
      }

      // Iterates over all children and invokes a given block
      each (block, deep) {
        const children = this.children();
        let i, il;

        for (i = 0, il = children.length; i < il; i++) {
          block.apply(children[i], [ i, children ]);

          if (deep) {
            children[i].each(block, deep);
          }
        }

        return this
      }

      element (nodeName, attrs) {
        return this.put(new Dom(create(nodeName), attrs))
      }

      // Get first child
      first () {
        return adopt(this.node.firstChild)
      }

      // Get a element at the given index
      get (i) {
        return adopt(this.node.childNodes[i])
      }

      getEventHolder () {
        return this.node
      }

      getEventTarget () {
        return this.node
      }

      // Checks if the given element is a child
      has (element) {
        return this.index(element) >= 0
      }

      html (htmlOrFn, outerHTML) {
        return this.xml(htmlOrFn, outerHTML, html)
      }

      // Get / set id
      id (id) {
        // generate new id if no id set
        if (typeof id === 'undefined' && !this.node.id) {
          this.node.id = eid(this.type);
        }

        // don't set directly with this.node.id to make `null` work correctly
        return this.attr('id', id)
      }

      // Gets index of given element
      index (element) {
        return [].slice.call(this.node.childNodes).indexOf(element.node)
      }

      // Get the last child
      last () {
        return adopt(this.node.lastChild)
      }

      // matches the element vs a css selector
      matches (selector) {
        const el = this.node;
        const matcher = el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector || null;
        return matcher && matcher.call(el, selector)
      }

      // Returns the parent element instance
      parent (type) {
        let parent = this;

        // check for parent
        if (!parent.node.parentNode) return null

        // get parent element
        parent = adopt(parent.node.parentNode);

        if (!type) return parent

        // loop trough ancestors if type is given
        do {
          if (typeof type === 'string' ? parent.matches(type) : parent instanceof type) return parent
        } while ((parent = adopt(parent.node.parentNode)))

        return parent
      }

      // Basically does the same as `add()` but returns the added element instead
      put (element, i) {
        element = makeInstance(element);
        this.add(element, i);
        return element
      }

      // Add element to given container and return container
      putIn (parent, i) {
        return makeInstance(parent).add(this, i)
      }

      // Remove element
      remove () {
        if (this.parent()) {
          this.parent().removeElement(this);
        }

        return this
      }

      // Remove a given child
      removeElement (element) {
        this.node.removeChild(element.node);

        return this
      }

      // Replace this with element
      replace (element) {
        element = makeInstance(element);

        if (this.node.parentNode) {
          this.node.parentNode.replaceChild(element.node, this.node);
        }

        return element
      }

      round (precision = 2, map = null) {
        const factor = 10 ** precision;
        const attrs = this.attr(map);

        for (const i in attrs) {
          if (typeof attrs[i] === 'number') {
            attrs[i] = Math.round(attrs[i] * factor) / factor;
          }
        }

        this.attr(attrs);
        return this
      }

      // Import / Export raw svg
      svg (svgOrFn, outerSVG) {
        return this.xml(svgOrFn, outerSVG, svg)
      }

      // Return id on string conversion
      toString () {
        return this.id()
      }

      words (text) {
        // This is faster than removing all children and adding a new one
        this.node.textContent = text;
        return this
      }

      wrap (node) {
        const parent = this.parent();

        if (!parent) {
          return this.addTo(node)
        }

        const position = parent.index(this);
        return parent.put(node, position).put(this)
      }

      // write svgjs data to the dom
      writeDataToDom () {
        // dump variables recursively
        this.each(function () {
          this.writeDataToDom();
        });

        return this
      }

      // Import / Export raw svg
      xml (xmlOrFn, outerXML, ns) {
        if (typeof xmlOrFn === 'boolean') {
          ns = outerXML;
          outerXML = xmlOrFn;
          xmlOrFn = null;
        }

        // act as getter if no svg string is given
        if (xmlOrFn == null || typeof xmlOrFn === 'function') {
          // The default for exports is, that the outerNode is included
          outerXML = outerXML == null ? true : outerXML;

          // write svgjs data to the dom
          this.writeDataToDom();
          let current = this;

          // An export modifier was passed
          if (xmlOrFn != null) {
            current = adopt(current.node.cloneNode(true));

            // If the user wants outerHTML we need to process this node, too
            if (outerXML) {
              const result = xmlOrFn(current);
              current = result || current;

              // The user does not want this node? Well, then he gets nothing
              if (result === false) return ''
            }

            // Deep loop through all children and apply modifier
            current.each(function () {
              const result = xmlOrFn(this);
              const _this = result || this;

              // If modifier returns false, discard node
              if (result === false) {
                this.remove();

                // If modifier returns new node, use it
              } else if (result && this !== _this) {
                this.replace(_this);
              }
            }, true);
          }

          // Return outer or inner content
          return outerXML
            ? current.node.outerHTML
            : current.node.innerHTML
        }

        // Act as setter if we got a string

        // The default for import is, that the current node is not replaced
        outerXML = outerXML == null ? false : outerXML;

        // Create temporary holder
        const well = create('wrapper', ns);
        const fragment = globals.document.createDocumentFragment();

        // Dump raw svg
        well.innerHTML = xmlOrFn;

        // Transplant nodes into the fragment
        for (let len = well.children.length; len--;) {
          fragment.appendChild(well.firstElementChild);
        }

        const parent = this.parent();

        // Add the whole fragment at once
        return outerXML
          ? this.replace(fragment) && parent
          : this.add(fragment)
      }
    }

    extend(Dom, { attr: attr$1, find, findOne });
    register(Dom, 'Dom');

    class Element extends Dom {
      constructor (node, attrs) {
        super(node, attrs);

        // initialize data object
        this.dom = {};

        // create circular reference
        this.node.instance = this;

        if (node.hasAttribute('svgjs:data')) {
          // pull svgjs data from the dom (getAttributeNS doesn't work in html5)
          this.setData(JSON.parse(node.getAttribute('svgjs:data')) || {});
        }
      }

      // Move element by its center
      center (x, y) {
        return this.cx(x).cy(y)
      }

      // Move by center over x-axis
      cx (x) {
        return x == null
          ? this.x() + this.width() / 2
          : this.x(x - this.width() / 2)
      }

      // Move by center over y-axis
      cy (y) {
        return y == null
          ? this.y() + this.height() / 2
          : this.y(y - this.height() / 2)
      }

      // Get defs
      defs () {
        const root = this.root();
        return root && root.defs()
      }

      // Relative move over x and y axes
      dmove (x, y) {
        return this.dx(x).dy(y)
      }

      // Relative move over x axis
      dx (x = 0) {
        return this.x(new SVGNumber(x).plus(this.x()))
      }

      // Relative move over y axis
      dy (y = 0) {
        return this.y(new SVGNumber(y).plus(this.y()))
      }

      getEventHolder () {
        return this
      }

      // Set height of element
      height (height) {
        return this.attr('height', height)
      }

      // Move element to given x and y values
      move (x, y) {
        return this.x(x).y(y)
      }

      // return array of all ancestors of given type up to the root svg
      parents (until = this.root()) {
        const isSelector = typeof until === 'string';
        if (!isSelector) {
          until = makeInstance(until);
        }
        const parents = new List();
        let parent = this;

        while (
          (parent = parent.parent())
          && parent.node !== globals.document
          && parent.nodeName !== '#document-fragment') {

          parents.push(parent);

          if (!isSelector && (parent.node === until.node)) {
            break
          }
          if (isSelector && parent.matches(until)) {
            break
          }
          if (parent.node === this.root().node) {
            // We worked our way to the root and didn't match `until`
            return null
          }
        }

        return parents
      }

      // Get referenced element form attribute value
      reference (attr) {
        attr = this.attr(attr);
        if (!attr) return null

        const m = (attr + '').match(reference);
        return m ? makeInstance(m[1]) : null
      }

      // Get parent document
      root () {
        const p = this.parent(getClass(root));
        return p && p.root()
      }

      // set given data to the elements data property
      setData (o) {
        this.dom = o;
        return this
      }

      // Set element size to given width and height
      size (width, height) {
        const p = proportionalSize(this, width, height);

        return this
          .width(new SVGNumber(p.width))
          .height(new SVGNumber(p.height))
      }

      // Set width of element
      width (width) {
        return this.attr('width', width)
      }

      // write svgjs data to the dom
      writeDataToDom () {
        // remove previously set data
        this.node.removeAttribute('svgjs:data');

        if (Object.keys(this.dom).length) {
          this.node.setAttribute('svgjs:data', JSON.stringify(this.dom)); // see #428
        }

        return super.writeDataToDom()
      }

      // Move over x-axis
      x (x) {
        return this.attr('x', x)
      }

      // Move over y-axis
      y (y) {
        return this.attr('y', y)
      }
    }

    extend(Element, {
      bbox, rbox, inside, point, ctm, screenCTM
    });

    register(Element, 'Element');

    // Define list of available attributes for stroke and fill
    const sugar = {
      stroke: [ 'color', 'width', 'opacity', 'linecap', 'linejoin', 'miterlimit', 'dasharray', 'dashoffset' ],
      fill: [ 'color', 'opacity', 'rule' ],
      prefix: function (t, a) {
        return a === 'color' ? t : t + '-' + a
      }
    }

    // Add sugar for fill and stroke
    ;[ 'fill', 'stroke' ].forEach(function (m) {
      const extension = {};
      let i;

      extension[m] = function (o) {
        if (typeof o === 'undefined') {
          return this.attr(m)
        }
        if (typeof o === 'string' || o instanceof Color || Color.isRgb(o) || (o instanceof Element)) {
          this.attr(m, o);
        } else {
          // set all attributes from sugar.fill and sugar.stroke list
          for (i = sugar[m].length - 1; i >= 0; i--) {
            if (o[sugar[m][i]] != null) {
              this.attr(sugar.prefix(m, sugar[m][i]), o[sugar[m][i]]);
            }
          }
        }

        return this
      };

      registerMethods([ 'Element', 'Runner' ], extension);
    });

    registerMethods([ 'Element', 'Runner' ], {
      // Let the user set the matrix directly
      matrix: function (mat, b, c, d, e, f) {
        // Act as a getter
        if (mat == null) {
          return new Matrix(this)
        }

        // Act as a setter, the user can pass a matrix or a set of numbers
        return this.attr('transform', new Matrix(mat, b, c, d, e, f))
      },

      // Map rotation to transform
      rotate: function (angle, cx, cy) {
        return this.transform({ rotate: angle, ox: cx, oy: cy }, true)
      },

      // Map skew to transform
      skew: function (x, y, cx, cy) {
        return arguments.length === 1 || arguments.length === 3
          ? this.transform({ skew: x, ox: y, oy: cx }, true)
          : this.transform({ skew: [ x, y ], ox: cx, oy: cy }, true)
      },

      shear: function (lam, cx, cy) {
        return this.transform({ shear: lam, ox: cx, oy: cy }, true)
      },

      // Map scale to transform
      scale: function (x, y, cx, cy) {
        return arguments.length === 1 || arguments.length === 3
          ? this.transform({ scale: x, ox: y, oy: cx }, true)
          : this.transform({ scale: [ x, y ], ox: cx, oy: cy }, true)
      },

      // Map translate to transform
      translate: function (x, y) {
        return this.transform({ translate: [ x, y ] }, true)
      },

      // Map relative translations to transform
      relative: function (x, y) {
        return this.transform({ relative: [ x, y ] }, true)
      },

      // Map flip to transform
      flip: function (direction = 'both', origin = 'center') {
        if ('xybothtrue'.indexOf(direction) === -1) {
          origin = direction;
          direction = 'both';
        }

        return this.transform({ flip: direction, origin: origin }, true)
      },

      // Opacity
      opacity: function (value) {
        return this.attr('opacity', value)
      }
    });

    registerMethods('radius', {
      // Add x and y radius
      radius: function (x, y = x) {
        const type = (this._element || this).type;
        return type === 'radialGradient'
          ? this.attr('r', new SVGNumber(x))
          : this.rx(x).ry(y)
      }
    });

    registerMethods('Path', {
      // Get path length
      length: function () {
        return this.node.getTotalLength()
      },
      // Get point at length
      pointAt: function (length) {
        return new Point(this.node.getPointAtLength(length))
      }
    });

    registerMethods([ 'Element', 'Runner' ], {
      // Set font
      font: function (a, v) {
        if (typeof a === 'object') {
          for (v in a) this.font(v, a[v]);
          return this
        }

        return a === 'leading'
          ? this.leading(v)
          : a === 'anchor'
            ? this.attr('text-anchor', v)
            : a === 'size' || a === 'family' || a === 'weight' || a === 'stretch' || a === 'variant' || a === 'style'
              ? this.attr('font-' + a, v)
              : this.attr(a, v)
      }
    });

    // Add events to elements
    const methods$1 = [ 'click',
      'dblclick',
      'mousedown',
      'mouseup',
      'mouseover',
      'mouseout',
      'mousemove',
      'mouseenter',
      'mouseleave',
      'touchstart',
      'touchmove',
      'touchleave',
      'touchend',
      'touchcancel' ].reduce(function (last, event) {
      // add event to Element
      const fn = function (f) {
        if (f === null) {
          this.off(event);
        } else {
          this.on(event, f);
        }
        return this
      };

      last[event] = fn;
      return last
    }, {});

    registerMethods('Element', methods$1);

    // Reset all transformations
    function untransform () {
      return this.attr('transform', null)
    }

    // merge the whole transformation chain into one matrix and returns it
    function matrixify () {
      const matrix = (this.attr('transform') || '')
        // split transformations
        .split(transforms).slice(0, -1).map(function (str) {
          // generate key => value pairs
          const kv = str.trim().split('(');
          return [ kv[0],
            kv[1].split(delimiter)
              .map(function (str) {
                return parseFloat(str)
              })
          ]
        })
        .reverse()
        // merge every transformation into one matrix
        .reduce(function (matrix, transform) {
          if (transform[0] === 'matrix') {
            return matrix.lmultiply(Matrix.fromArray(transform[1]))
          }
          return matrix[transform[0]].apply(matrix, transform[1])
        }, new Matrix());

      return matrix
    }

    // add an element to another parent without changing the visual representation on the screen
    function toParent (parent, i) {
      if (this === parent) return this
      const ctm = this.screenCTM();
      const pCtm = parent.screenCTM().inverse();

      this.addTo(parent, i).untransform().transform(pCtm.multiply(ctm));

      return this
    }

    // same as above with parent equals root-svg
    function toRoot (i) {
      return this.toParent(this.root(), i)
    }

    // Add transformations
    function transform (o, relative) {
      // Act as a getter if no object was passed
      if (o == null || typeof o === 'string') {
        const decomposed = new Matrix(this).decompose();
        return o == null ? decomposed : decomposed[o]
      }

      if (!Matrix.isMatrixLike(o)) {
        // Set the origin according to the defined transform
        o = { ...o, origin: getOrigin(o, this) };
      }

      // The user can pass a boolean, an Element or an Matrix or nothing
      const cleanRelative = relative === true ? this : (relative || false);
      const result = new Matrix(cleanRelative).transform(o);
      return this.attr('transform', result)
    }

    registerMethods('Element', {
      untransform, matrixify, toParent, toRoot, transform
    });

    class Container extends Element {
      flatten (parent = this, index) {
        this.each(function () {
          if (this instanceof Container) {
            return this.flatten().ungroup()
          }
        });

        return this
      }

      ungroup (parent = this.parent(), index = parent.index(this)) {
        // when parent != this, we want append all elements to the end
        index = index === -1 ? parent.children().length : index;

        this.each(function (i, children) {
          // reverse each
          return children[children.length - i - 1].toParent(parent, index)
        });

        return this.remove()
      }
    }

    register(Container, 'Container');

    class Defs extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('defs', node), attrs);
      }

      flatten () {
        return this
      }

      ungroup () {
        return this
      }
    }

    register(Defs, 'Defs');

    class Shape extends Element {}

    register(Shape, 'Shape');

    // Radius x value
    function rx (rx) {
      return this.attr('rx', rx)
    }

    // Radius y value
    function ry (ry) {
      return this.attr('ry', ry)
    }

    // Move over x-axis
    function x (x) {
      return x == null
        ? this.cx() - this.rx()
        : this.cx(x + this.rx())
    }

    // Move over y-axis
    function y (y) {
      return y == null
        ? this.cy() - this.ry()
        : this.cy(y + this.ry())
    }

    // Move by center over x-axis
    function cx (x) {
      return this.attr('cx', x)
    }

    // Move by center over y-axis
    function cy (y) {
      return this.attr('cy', y)
    }

    // Set width of element
    function width (width) {
      return width == null
        ? this.rx() * 2
        : this.rx(new SVGNumber(width).divide(2))
    }

    // Set height of element
    function height (height) {
      return height == null
        ? this.ry() * 2
        : this.ry(new SVGNumber(height).divide(2))
    }

    var circled = /*#__PURE__*/Object.freeze({
        __proto__: null,
        rx: rx,
        ry: ry,
        x: x,
        y: y,
        cx: cx,
        cy: cy,
        width: width,
        height: height
    });

    class Ellipse extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('ellipse', node), attrs);
      }

      size (width, height) {
        const p = proportionalSize(this, width, height);

        return this
          .rx(new SVGNumber(p.width).divide(2))
          .ry(new SVGNumber(p.height).divide(2))
      }
    }

    extend(Ellipse, circled);

    registerMethods('Container', {
      // Create an ellipse
      ellipse: wrapWithAttrCheck(function (width = 0, height = width) {
        return this.put(new Ellipse()).size(width, height).move(0, 0)
      })
    });

    register(Ellipse, 'Ellipse');

    class Fragment extends Dom {
      constructor (node = globals.document.createDocumentFragment()) {
        super(node);
      }

      // Import / Export raw xml
      xml (xmlOrFn, outerXML, ns) {
        if (typeof xmlOrFn === 'boolean') {
          ns = outerXML;
          outerXML = xmlOrFn;
          xmlOrFn = null;
        }

        // because this is a fragment we have to put all elements into a wrapper first
        // before we can get the innerXML from it
        if (xmlOrFn == null || typeof xmlOrFn === 'function') {
          const wrapper = new Dom(create('wrapper', ns));
          wrapper.add(this.node.cloneNode(true));

          return wrapper.xml(false, ns)
        }

        // Act as setter if we got a string
        return super.xml(xmlOrFn, false, ns)
      }

    }

    register(Fragment, 'Fragment');

    function from (x, y) {
      return (this._element || this).type === 'radialGradient'
        ? this.attr({ fx: new SVGNumber(x), fy: new SVGNumber(y) })
        : this.attr({ x1: new SVGNumber(x), y1: new SVGNumber(y) })
    }

    function to (x, y) {
      return (this._element || this).type === 'radialGradient'
        ? this.attr({ cx: new SVGNumber(x), cy: new SVGNumber(y) })
        : this.attr({ x2: new SVGNumber(x), y2: new SVGNumber(y) })
    }

    var gradiented = /*#__PURE__*/Object.freeze({
        __proto__: null,
        from: from,
        to: to
    });

    class Gradient extends Container {
      constructor (type, attrs) {
        super(
          nodeOrNew(type + 'Gradient', typeof type === 'string' ? null : type),
          attrs
        );
      }

      // custom attr to handle transform
      attr (a, b, c) {
        if (a === 'transform') a = 'gradientTransform';
        return super.attr(a, b, c)
      }

      bbox () {
        return new Box()
      }

      targets () {
        return baseFind('svg [fill*="' + this.id() + '"]')
      }

      // Alias string conversion to fill
      toString () {
        return this.url()
      }

      // Update gradient
      update (block) {
        // remove all stops
        this.clear();

        // invoke passed block
        if (typeof block === 'function') {
          block.call(this, this);
        }

        return this
      }

      // Return the fill id
      url () {
        return 'url("#' + this.id() + '")'
      }
    }

    extend(Gradient, gradiented);

    registerMethods({
      Container: {
        // Create gradient element in defs
        gradient (...args) {
          return this.defs().gradient(...args)
        }
      },
      // define gradient
      Defs: {
        gradient: wrapWithAttrCheck(function (type, block) {
          return this.put(new Gradient(type)).update(block)
        })
      }
    });

    register(Gradient, 'Gradient');

    class Pattern extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('pattern', node), attrs);
      }

      // custom attr to handle transform
      attr (a, b, c) {
        if (a === 'transform') a = 'patternTransform';
        return super.attr(a, b, c)
      }

      bbox () {
        return new Box()
      }

      targets () {
        return baseFind('svg [fill*="' + this.id() + '"]')
      }

      // Alias string conversion to fill
      toString () {
        return this.url()
      }

      // Update pattern by rebuilding
      update (block) {
        // remove content
        this.clear();

        // invoke passed block
        if (typeof block === 'function') {
          block.call(this, this);
        }

        return this
      }

      // Return the fill id
      url () {
        return 'url("#' + this.id() + '")'
      }

    }

    registerMethods({
      Container: {
        // Create pattern element in defs
        pattern (...args) {
          return this.defs().pattern(...args)
        }
      },
      Defs: {
        pattern: wrapWithAttrCheck(function (width, height, block) {
          return this.put(new Pattern()).update(block).attr({
            x: 0,
            y: 0,
            width: width,
            height: height,
            patternUnits: 'userSpaceOnUse'
          })
        })
      }
    });

    register(Pattern, 'Pattern');

    class Image extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('image', node), attrs);
      }

      // (re)load image
      load (url, callback) {
        if (!url) return this

        const img = new globals.window.Image();

        on(img, 'load', function (e) {
          const p = this.parent(Pattern);

          // ensure image size
          if (this.width() === 0 && this.height() === 0) {
            this.size(img.width, img.height);
          }

          if (p instanceof Pattern) {
            // ensure pattern size if not set
            if (p.width() === 0 && p.height() === 0) {
              p.size(this.width(), this.height());
            }
          }

          if (typeof callback === 'function') {
            callback.call(this, e);
          }
        }, this);

        on(img, 'load error', function () {
          // dont forget to unbind memory leaking events
          off(img);
        });

        return this.attr('href', (img.src = url), xlink)
      }
    }

    registerAttrHook(function (attr, val, _this) {
      // convert image fill and stroke to patterns
      if (attr === 'fill' || attr === 'stroke') {
        if (isImage.test(val)) {
          val = _this.root().defs().image(val);
        }
      }

      if (val instanceof Image) {
        val = _this.root().defs().pattern(0, 0, (pattern) => {
          pattern.add(val);
        });
      }

      return val
    });

    registerMethods({
      Container: {
        // create image element, load image and set its size
        image: wrapWithAttrCheck(function (source, callback) {
          return this.put(new Image()).size(0, 0).load(source, callback)
        })
      }
    });

    register(Image, 'Image');

    class PointArray extends SVGArray {
      // Get bounding box of points
      bbox () {
        let maxX = -Infinity;
        let maxY = -Infinity;
        let minX = Infinity;
        let minY = Infinity;
        this.forEach(function (el) {
          maxX = Math.max(el[0], maxX);
          maxY = Math.max(el[1], maxY);
          minX = Math.min(el[0], minX);
          minY = Math.min(el[1], minY);
        });
        return new Box(minX, minY, maxX - minX, maxY - minY)
      }

      // Move point string
      move (x, y) {
        const box = this.bbox();

        // get relative offset
        x -= box.x;
        y -= box.y;

        // move every point
        if (!isNaN(x) && !isNaN(y)) {
          for (let i = this.length - 1; i >= 0; i--) {
            this[i] = [ this[i][0] + x, this[i][1] + y ];
          }
        }

        return this
      }

      // Parse point string and flat array
      parse (array = [ 0, 0 ]) {
        const points = [];

        // if it is an array, we flatten it and therefore clone it to 1 depths
        if (array instanceof Array) {
          array = Array.prototype.concat.apply([], array);
        } else { // Else, it is considered as a string
          // parse points
          array = array.trim().split(delimiter).map(parseFloat);
        }

        // validate points - https://svgwg.org/svg2-draft/shapes.html#DataTypePoints
        // Odd number of coordinates is an error. In such cases, drop the last odd coordinate.
        if (array.length % 2 !== 0) array.pop();

        // wrap points in two-tuples
        for (let i = 0, len = array.length; i < len; i = i + 2) {
          points.push([ array[i], array[i + 1] ]);
        }

        return points
      }

      // Resize poly string
      size (width, height) {
        let i;
        const box = this.bbox();

        // recalculate position of all points according to new size
        for (i = this.length - 1; i >= 0; i--) {
          if (box.width) this[i][0] = ((this[i][0] - box.x) * width) / box.width + box.x;
          if (box.height) this[i][1] = ((this[i][1] - box.y) * height) / box.height + box.y;
        }

        return this
      }

      // Convert array to line object
      toLine () {
        return {
          x1: this[0][0],
          y1: this[0][1],
          x2: this[1][0],
          y2: this[1][1]
        }
      }

      // Convert array to string
      toString () {
        const array = [];
        // convert to a poly point string
        for (let i = 0, il = this.length; i < il; i++) {
          array.push(this[i].join(','));
        }

        return array.join(' ')
      }

      transform (m) {
        return this.clone().transformO(m)
      }

      // transform points with matrix (similar to Point.transform)
      transformO (m) {
        if (!Matrix.isMatrixLike(m)) {
          m = new Matrix(m);
        }

        for (let i = this.length; i--;) {
          // Perform the matrix multiplication
          const [ x, y ] = this[i];
          this[i][0] = m.a * x + m.c * y + m.e;
          this[i][1] = m.b * x + m.d * y + m.f;
        }

        return this
      }

    }

    const MorphArray = PointArray;

    // Move by left top corner over x-axis
    function x$1 (x) {
      return x == null ? this.bbox().x : this.move(x, this.bbox().y)
    }

    // Move by left top corner over y-axis
    function y$1 (y) {
      return y == null ? this.bbox().y : this.move(this.bbox().x, y)
    }

    // Set width of element
    function width$1 (width) {
      const b = this.bbox();
      return width == null ? b.width : this.size(width, b.height)
    }

    // Set height of element
    function height$1 (height) {
      const b = this.bbox();
      return height == null ? b.height : this.size(b.width, height)
    }

    var pointed = /*#__PURE__*/Object.freeze({
        __proto__: null,
        MorphArray: MorphArray,
        x: x$1,
        y: y$1,
        width: width$1,
        height: height$1
    });

    class Line extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('line', node), attrs);
      }

      // Get array
      array () {
        return new PointArray([
          [ this.attr('x1'), this.attr('y1') ],
          [ this.attr('x2'), this.attr('y2') ]
        ])
      }

      // Move by left top corner
      move (x, y) {
        return this.attr(this.array().move(x, y).toLine())
      }

      // Overwrite native plot() method
      plot (x1, y1, x2, y2) {
        if (x1 == null) {
          return this.array()
        } else if (typeof y1 !== 'undefined') {
          x1 = { x1, y1, x2, y2 };
        } else {
          x1 = new PointArray(x1).toLine();
        }

        return this.attr(x1)
      }

      // Set element size to given width and height
      size (width, height) {
        const p = proportionalSize(this, width, height);
        return this.attr(this.array().size(p.width, p.height).toLine())
      }
    }

    extend(Line, pointed);

    registerMethods({
      Container: {
        // Create a line element
        line: wrapWithAttrCheck(function (...args) {
          // make sure plot is called as a setter
          // x1 is not necessarily a number, it can also be an array, a string and a PointArray
          return Line.prototype.plot.apply(
            this.put(new Line())
            , args[0] != null ? args : [ 0, 0, 0, 0 ]
          )
        })
      }
    });

    register(Line, 'Line');

    class Marker extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('marker', node), attrs);
      }

      // Set height of element
      height (height) {
        return this.attr('markerHeight', height)
      }

      orient (orient) {
        return this.attr('orient', orient)
      }

      // Set marker refX and refY
      ref (x, y) {
        return this.attr('refX', x).attr('refY', y)
      }

      // Return the fill id
      toString () {
        return 'url(#' + this.id() + ')'
      }

      // Update marker
      update (block) {
        // remove all content
        this.clear();

        // invoke passed block
        if (typeof block === 'function') {
          block.call(this, this);
        }

        return this
      }

      // Set width of element
      width (width) {
        return this.attr('markerWidth', width)
      }

    }

    registerMethods({
      Container: {
        marker (...args) {
          // Create marker element in defs
          return this.defs().marker(...args)
        }
      },
      Defs: {
        // Create marker
        marker: wrapWithAttrCheck(function (width, height, block) {
          // Set default viewbox to match the width and height, set ref to cx and cy and set orient to auto
          return this.put(new Marker())
            .size(width, height)
            .ref(width / 2, height / 2)
            .viewbox(0, 0, width, height)
            .attr('orient', 'auto')
            .update(block)
        })
      },
      marker: {
        // Create and attach markers
        marker (marker, width, height, block) {
          let attr = [ 'marker' ];

          // Build attribute name
          if (marker !== 'all') attr.push(marker);
          attr = attr.join('-');

          // Set marker attribute
          marker = arguments[1] instanceof Marker
            ? arguments[1]
            : this.defs().marker(width, height, block);

          return this.attr(attr, marker)
        }
      }
    });

    register(Marker, 'Marker');

    /***
    Base Class
    ==========
    The base stepper class that will be
    ***/

    function makeSetterGetter (k, f) {
      return function (v) {
        if (v == null) return this[k]
        this[k] = v;
        if (f) f.call(this);
        return this
      }
    }

    const easing = {
      '-': function (pos) {
        return pos
      },
      '<>': function (pos) {
        return -Math.cos(pos * Math.PI) / 2 + 0.5
      },
      '>': function (pos) {
        return Math.sin(pos * Math.PI / 2)
      },
      '<': function (pos) {
        return -Math.cos(pos * Math.PI / 2) + 1
      },
      bezier: function (x1, y1, x2, y2) {
        // see https://www.w3.org/TR/css-easing-1/#cubic-bezier-algo
        return function (t) {
          if (t < 0) {
            if (x1 > 0) {
              return y1 / x1 * t
            } else if (x2 > 0) {
              return y2 / x2 * t
            } else {
              return 0
            }
          } else if (t > 1) {
            if (x2 < 1) {
              return (1 - y2) / (1 - x2) * t + (y2 - x2) / (1 - x2)
            } else if (x1 < 1) {
              return (1 - y1) / (1 - x1) * t + (y1 - x1) / (1 - x1)
            } else {
              return 1
            }
          } else {
            return 3 * t * (1 - t) ** 2 * y1 + 3 * t ** 2 * (1 - t) * y2 + t ** 3
          }
        }
      },
      // see https://www.w3.org/TR/css-easing-1/#step-timing-function-algo
      steps: function (steps, stepPosition = 'end') {
        // deal with "jump-" prefix
        stepPosition = stepPosition.split('-').reverse()[0];

        let jumps = steps;
        if (stepPosition === 'none') {
          --jumps;
        } else if (stepPosition === 'both') {
          ++jumps;
        }

        // The beforeFlag is essentially useless
        return (t, beforeFlag = false) => {
          // Step is called currentStep in referenced url
          let step = Math.floor(t * steps);
          const jumping = (t * step) % 1 === 0;

          if (stepPosition === 'start' || stepPosition === 'both') {
            ++step;
          }

          if (beforeFlag && jumping) {
            --step;
          }

          if (t >= 0 && step < 0) {
            step = 0;
          }

          if (t <= 1 && step > jumps) {
            step = jumps;
          }

          return step / jumps
        }
      }
    };

    class Stepper {
      done () {
        return false
      }
    }

    /***
    Easing Functions
    ================
    ***/

    class Ease extends Stepper {
      constructor (fn = timeline.ease) {
        super();
        this.ease = easing[fn] || fn;
      }

      step (from, to, pos) {
        if (typeof from !== 'number') {
          return pos < 1 ? from : to
        }
        return from + (to - from) * this.ease(pos)
      }
    }

    /***
    Controller Types
    ================
    ***/

    class Controller extends Stepper {
      constructor (fn) {
        super();
        this.stepper = fn;
      }

      done (c) {
        return c.done
      }

      step (current, target, dt, c) {
        return this.stepper(current, target, dt, c)
      }

    }

    function recalculate () {
      // Apply the default parameters
      const duration = (this._duration || 500) / 1000;
      const overshoot = this._overshoot || 0;

      // Calculate the PID natural response
      const eps = 1e-10;
      const pi = Math.PI;
      const os = Math.log(overshoot / 100 + eps);
      const zeta = -os / Math.sqrt(pi * pi + os * os);
      const wn = 3.9 / (zeta * duration);

      // Calculate the Spring values
      this.d = 2 * zeta * wn;
      this.k = wn * wn;
    }

    class Spring extends Controller {
      constructor (duration = 500, overshoot = 0) {
        super();
        this.duration(duration)
          .overshoot(overshoot);
      }

      step (current, target, dt, c) {
        if (typeof current === 'string') return current
        c.done = dt === Infinity;
        if (dt === Infinity) return target
        if (dt === 0) return current

        if (dt > 100) dt = 16;

        dt /= 1000;

        // Get the previous velocity
        const velocity = c.velocity || 0;

        // Apply the control to get the new position and store it
        const acceleration = -this.d * velocity - this.k * (current - target);
        const newPosition = current
          + velocity * dt
          + acceleration * dt * dt / 2;

        // Store the velocity
        c.velocity = velocity + acceleration * dt;

        // Figure out if we have converged, and if so, pass the value
        c.done = Math.abs(target - newPosition) + Math.abs(velocity) < 0.002;
        return c.done ? target : newPosition
      }
    }

    extend(Spring, {
      duration: makeSetterGetter('_duration', recalculate),
      overshoot: makeSetterGetter('_overshoot', recalculate)
    });

    class PID extends Controller {
      constructor (p = 0.1, i = 0.01, d = 0, windup = 1000) {
        super();
        this.p(p).i(i).d(d).windup(windup);
      }

      step (current, target, dt, c) {
        if (typeof current === 'string') return current
        c.done = dt === Infinity;

        if (dt === Infinity) return target
        if (dt === 0) return current

        const p = target - current;
        let i = (c.integral || 0) + p * dt;
        const d = (p - (c.error || 0)) / dt;
        const windup = this._windup;

        // antiwindup
        if (windup !== false) {
          i = Math.max(-windup, Math.min(i, windup));
        }

        c.error = p;
        c.integral = i;

        c.done = Math.abs(p) < 0.001;

        return c.done ? target : current + (this.P * p + this.I * i + this.D * d)
      }
    }

    extend(PID, {
      windup: makeSetterGetter('_windup'),
      p: makeSetterGetter('P'),
      i: makeSetterGetter('I'),
      d: makeSetterGetter('D')
    });

    const segmentParameters = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

    const pathHandlers = {
      M: function (c, p, p0) {
        p.x = p0.x = c[0];
        p.y = p0.y = c[1];

        return [ 'M', p.x, p.y ]
      },
      L: function (c, p) {
        p.x = c[0];
        p.y = c[1];
        return [ 'L', c[0], c[1] ]
      },
      H: function (c, p) {
        p.x = c[0];
        return [ 'H', c[0] ]
      },
      V: function (c, p) {
        p.y = c[0];
        return [ 'V', c[0] ]
      },
      C: function (c, p) {
        p.x = c[4];
        p.y = c[5];
        return [ 'C', c[0], c[1], c[2], c[3], c[4], c[5] ]
      },
      S: function (c, p) {
        p.x = c[2];
        p.y = c[3];
        return [ 'S', c[0], c[1], c[2], c[3] ]
      },
      Q: function (c, p) {
        p.x = c[2];
        p.y = c[3];
        return [ 'Q', c[0], c[1], c[2], c[3] ]
      },
      T: function (c, p) {
        p.x = c[0];
        p.y = c[1];
        return [ 'T', c[0], c[1] ]
      },
      Z: function (c, p, p0) {
        p.x = p0.x;
        p.y = p0.y;
        return [ 'Z' ]
      },
      A: function (c, p) {
        p.x = c[5];
        p.y = c[6];
        return [ 'A', c[0], c[1], c[2], c[3], c[4], c[5], c[6] ]
      }
    };

    const mlhvqtcsaz = 'mlhvqtcsaz'.split('');

    for (let i = 0, il = mlhvqtcsaz.length; i < il; ++i) {
      pathHandlers[mlhvqtcsaz[i]] = (function (i) {
        return function (c, p, p0) {
          if (i === 'H') c[0] = c[0] + p.x;
          else if (i === 'V') c[0] = c[0] + p.y;
          else if (i === 'A') {
            c[5] = c[5] + p.x;
            c[6] = c[6] + p.y;
          } else {
            for (let j = 0, jl = c.length; j < jl; ++j) {
              c[j] = c[j] + (j % 2 ? p.y : p.x);
            }
          }

          return pathHandlers[i](c, p, p0)
        }
      })(mlhvqtcsaz[i].toUpperCase());
    }

    function makeAbsolut (parser) {
      const command = parser.segment[0];
      return pathHandlers[command](parser.segment.slice(1), parser.p, parser.p0)
    }

    function segmentComplete (parser) {
      return parser.segment.length && parser.segment.length - 1 === segmentParameters[parser.segment[0].toUpperCase()]
    }

    function startNewSegment (parser, token) {
      parser.inNumber && finalizeNumber(parser, false);
      const pathLetter = isPathLetter.test(token);

      if (pathLetter) {
        parser.segment = [ token ];
      } else {
        const lastCommand = parser.lastCommand;
        const small = lastCommand.toLowerCase();
        const isSmall = lastCommand === small;
        parser.segment = [ small === 'm' ? (isSmall ? 'l' : 'L') : lastCommand ];
      }

      parser.inSegment = true;
      parser.lastCommand = parser.segment[0];

      return pathLetter
    }

    function finalizeNumber (parser, inNumber) {
      if (!parser.inNumber) throw new Error('Parser Error')
      parser.number && parser.segment.push(parseFloat(parser.number));
      parser.inNumber = inNumber;
      parser.number = '';
      parser.pointSeen = false;
      parser.hasExponent = false;

      if (segmentComplete(parser)) {
        finalizeSegment(parser);
      }
    }

    function finalizeSegment (parser) {
      parser.inSegment = false;
      if (parser.absolute) {
        parser.segment = makeAbsolut(parser);
      }
      parser.segments.push(parser.segment);
    }

    function isArcFlag (parser) {
      if (!parser.segment.length) return false
      const isArc = parser.segment[0].toUpperCase() === 'A';
      const length = parser.segment.length;

      return isArc && (length === 4 || length === 5)
    }

    function isExponential (parser) {
      return parser.lastToken.toUpperCase() === 'E'
    }

    function pathParser (d, toAbsolute = true) {

      let index = 0;
      let token = '';
      const parser = {
        segment: [],
        inNumber: false,
        number: '',
        lastToken: '',
        inSegment: false,
        segments: [],
        pointSeen: false,
        hasExponent: false,
        absolute: toAbsolute,
        p0: new Point(),
        p: new Point()
      };

      while ((parser.lastToken = token, token = d.charAt(index++))) {
        if (!parser.inSegment) {
          if (startNewSegment(parser, token)) {
            continue
          }
        }

        if (token === '.') {
          if (parser.pointSeen || parser.hasExponent) {
            finalizeNumber(parser, false);
            --index;
            continue
          }
          parser.inNumber = true;
          parser.pointSeen = true;
          parser.number += token;
          continue
        }

        if (!isNaN(parseInt(token))) {

          if (parser.number === '0' || isArcFlag(parser)) {
            parser.inNumber = true;
            parser.number = token;
            finalizeNumber(parser, true);
            continue
          }

          parser.inNumber = true;
          parser.number += token;
          continue
        }

        if (token === ' ' || token === ',') {
          if (parser.inNumber) {
            finalizeNumber(parser, false);
          }
          continue
        }

        if (token === '-') {
          if (parser.inNumber && !isExponential(parser)) {
            finalizeNumber(parser, false);
            --index;
            continue
          }
          parser.number += token;
          parser.inNumber = true;
          continue
        }

        if (token.toUpperCase() === 'E') {
          parser.number += token;
          parser.hasExponent = true;
          continue
        }

        if (isPathLetter.test(token)) {
          if (parser.inNumber) {
            finalizeNumber(parser, false);
          } else if (!segmentComplete(parser)) {
            throw new Error('parser Error')
          } else {
            finalizeSegment(parser);
          }
          --index;
        }
      }

      if (parser.inNumber) {
        finalizeNumber(parser, false);
      }

      if (parser.inSegment && segmentComplete(parser)) {
        finalizeSegment(parser);
      }

      return parser.segments

    }

    function arrayToString (a) {
      let s = '';
      for (let i = 0, il = a.length; i < il; i++) {
        s += a[i][0];

        if (a[i][1] != null) {
          s += a[i][1];

          if (a[i][2] != null) {
            s += ' ';
            s += a[i][2];

            if (a[i][3] != null) {
              s += ' ';
              s += a[i][3];
              s += ' ';
              s += a[i][4];

              if (a[i][5] != null) {
                s += ' ';
                s += a[i][5];
                s += ' ';
                s += a[i][6];

                if (a[i][7] != null) {
                  s += ' ';
                  s += a[i][7];
                }
              }
            }
          }
        }
      }

      return s + ' '
    }

    class PathArray extends SVGArray {
      // Get bounding box of path
      bbox () {
        parser().path.setAttribute('d', this.toString());
        return new Box(parser.nodes.path.getBBox())
      }

      // Move path string
      move (x, y) {
        // get bounding box of current situation
        const box = this.bbox();

        // get relative offset
        x -= box.x;
        y -= box.y;

        if (!isNaN(x) && !isNaN(y)) {
          // move every point
          for (let l, i = this.length - 1; i >= 0; i--) {
            l = this[i][0];

            if (l === 'M' || l === 'L' || l === 'T') {
              this[i][1] += x;
              this[i][2] += y;
            } else if (l === 'H') {
              this[i][1] += x;
            } else if (l === 'V') {
              this[i][1] += y;
            } else if (l === 'C' || l === 'S' || l === 'Q') {
              this[i][1] += x;
              this[i][2] += y;
              this[i][3] += x;
              this[i][4] += y;

              if (l === 'C') {
                this[i][5] += x;
                this[i][6] += y;
              }
            } else if (l === 'A') {
              this[i][6] += x;
              this[i][7] += y;
            }
          }
        }

        return this
      }

      // Absolutize and parse path to array
      parse (d = 'M0 0') {
        if (Array.isArray(d)) {
          d = Array.prototype.concat.apply([], d).toString();
        }

        return pathParser(d)
      }

      // Resize path string
      size (width, height) {
        // get bounding box of current situation
        const box = this.bbox();
        let i, l;

        // If the box width or height is 0 then we ignore
        // transformations on the respective axis
        box.width = box.width === 0 ? 1 : box.width;
        box.height = box.height === 0 ? 1 : box.height;

        // recalculate position of all points according to new size
        for (i = this.length - 1; i >= 0; i--) {
          l = this[i][0];

          if (l === 'M' || l === 'L' || l === 'T') {
            this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
            this[i][2] = ((this[i][2] - box.y) * height) / box.height + box.y;
          } else if (l === 'H') {
            this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
          } else if (l === 'V') {
            this[i][1] = ((this[i][1] - box.y) * height) / box.height + box.y;
          } else if (l === 'C' || l === 'S' || l === 'Q') {
            this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
            this[i][2] = ((this[i][2] - box.y) * height) / box.height + box.y;
            this[i][3] = ((this[i][3] - box.x) * width) / box.width + box.x;
            this[i][4] = ((this[i][4] - box.y) * height) / box.height + box.y;

            if (l === 'C') {
              this[i][5] = ((this[i][5] - box.x) * width) / box.width + box.x;
              this[i][6] = ((this[i][6] - box.y) * height) / box.height + box.y;
            }
          } else if (l === 'A') {
            // resize radii
            this[i][1] = (this[i][1] * width) / box.width;
            this[i][2] = (this[i][2] * height) / box.height;

            // move position values
            this[i][6] = ((this[i][6] - box.x) * width) / box.width + box.x;
            this[i][7] = ((this[i][7] - box.y) * height) / box.height + box.y;
          }
        }

        return this
      }

      // Convert array to string
      toString () {
        return arrayToString(this)
      }

    }

    const getClassForType = (value) => {
      const type = typeof value;

      if (type === 'number') {
        return SVGNumber
      } else if (type === 'string') {
        if (Color.isColor(value)) {
          return Color
        } else if (delimiter.test(value)) {
          return isPathLetter.test(value)
            ? PathArray
            : SVGArray
        } else if (numberAndUnit.test(value)) {
          return SVGNumber
        } else {
          return NonMorphable
        }
      } else if (morphableTypes.indexOf(value.constructor) > -1) {
        return value.constructor
      } else if (Array.isArray(value)) {
        return SVGArray
      } else if (type === 'object') {
        return ObjectBag
      } else {
        return NonMorphable
      }
    };

    class Morphable {
      constructor (stepper) {
        this._stepper = stepper || new Ease('-');

        this._from = null;
        this._to = null;
        this._type = null;
        this._context = null;
        this._morphObj = null;
      }

      at (pos) {
        return this._morphObj.morph(this._from, this._to, pos, this._stepper, this._context)

      }

      done () {
        const complete = this._context
          .map(this._stepper.done)
          .reduce(function (last, curr) {
            return last && curr
          }, true);
        return complete
      }

      from (val) {
        if (val == null) {
          return this._from
        }

        this._from = this._set(val);
        return this
      }

      stepper (stepper) {
        if (stepper == null) return this._stepper
        this._stepper = stepper;
        return this
      }

      to (val) {
        if (val == null) {
          return this._to
        }

        this._to = this._set(val);
        return this
      }

      type (type) {
        // getter
        if (type == null) {
          return this._type
        }

        // setter
        this._type = type;
        return this
      }

      _set (value) {
        if (!this._type) {
          this.type(getClassForType(value));
        }

        let result = (new this._type(value));
        if (this._type === Color) {
          result = this._to
            ? result[this._to[4]]()
            : this._from
              ? result[this._from[4]]()
              : result;
        }

        if (this._type === ObjectBag) {
          result = this._to
            ? result.align(this._to)
            : this._from
              ? result.align(this._from)
              : result;
        }

        result = result.toConsumable();

        this._morphObj = this._morphObj || new this._type();
        this._context = this._context
          || Array.apply(null, Array(result.length))
            .map(Object)
            .map(function (o) {
              o.done = true;
              return o
            });
        return result
      }

    }

    class NonMorphable {
      constructor (...args) {
        this.init(...args);
      }

      init (val) {
        val = Array.isArray(val) ? val[0] : val;
        this.value = val;
        return this
      }

      toArray () {
        return [ this.value ]
      }

      valueOf () {
        return this.value
      }

    }

    class TransformBag {
      constructor (...args) {
        this.init(...args);
      }

      init (obj) {
        if (Array.isArray(obj)) {
          obj = {
            scaleX: obj[0],
            scaleY: obj[1],
            shear: obj[2],
            rotate: obj[3],
            translateX: obj[4],
            translateY: obj[5],
            originX: obj[6],
            originY: obj[7]
          };
        }

        Object.assign(this, TransformBag.defaults, obj);
        return this
      }

      toArray () {
        const v = this;

        return [
          v.scaleX,
          v.scaleY,
          v.shear,
          v.rotate,
          v.translateX,
          v.translateY,
          v.originX,
          v.originY
        ]
      }
    }

    TransformBag.defaults = {
      scaleX: 1,
      scaleY: 1,
      shear: 0,
      rotate: 0,
      translateX: 0,
      translateY: 0,
      originX: 0,
      originY: 0
    };

    const sortByKey = (a, b) => {
      return (a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0))
    };

    class ObjectBag {
      constructor (...args) {
        this.init(...args);
      }

      align (other) {
        const values = this.values;
        for (let i = 0, il = values.length; i < il; ++i) {

          // If the type is the same we only need to check if the color is in the correct format
          if (values[i + 1] === other[i + 1]) {
            if (values[i + 1] === Color && other[i + 7] !== values[i + 7]) {
              const space = other[i + 7];
              const color = new Color(this.values.splice(i + 3, 5))[space]().toArray();
              this.values.splice(i + 3, 0, ...color);
            }

            i += values[i + 2] + 2;
            continue
          }

          if (!other[i + 1]) {
            return this
          }

          // The types differ, so we overwrite the new type with the old one
          // And initialize it with the types default (e.g. black for color or 0 for number)
          const defaultObject = new (other[i + 1])().toArray();

          // Than we fix the values array
          const toDelete = (values[i + 2]) + 3;

          values.splice(i, toDelete, other[i], other[i + 1], other[i + 2], ...defaultObject);

          i += values[i + 2] + 2;
        }
        return this
      }

      init (objOrArr) {
        this.values = [];

        if (Array.isArray(objOrArr)) {
          this.values = objOrArr.slice();
          return
        }

        objOrArr = objOrArr || {};
        const entries = [];

        for (const i in objOrArr) {
          const Type = getClassForType(objOrArr[i]);
          const val = new Type(objOrArr[i]).toArray();
          entries.push([ i, Type, val.length, ...val ]);
        }

        entries.sort(sortByKey);

        this.values = entries.reduce((last, curr) => last.concat(curr), []);
        return this
      }

      toArray () {
        return this.values
      }

      valueOf () {
        const obj = {};
        const arr = this.values;

        // for (var i = 0, len = arr.length; i < len; i += 2) {
        while (arr.length) {
          const key = arr.shift();
          const Type = arr.shift();
          const num = arr.shift();
          const values = arr.splice(0, num);
          obj[key] = new Type(values);// .valueOf()
        }

        return obj
      }

    }

    const morphableTypes = [
      NonMorphable,
      TransformBag,
      ObjectBag
    ];

    function registerMorphableType (type = []) {
      morphableTypes.push(...[].concat(type));
    }

    function makeMorphable () {
      extend(morphableTypes, {
        to (val) {
          return new Morphable()
            .type(this.constructor)
            .from(this.toArray())// this.valueOf())
            .to(val)
        },
        fromArray (arr) {
          this.init(arr);
          return this
        },
        toConsumable () {
          return this.toArray()
        },
        morph (from, to, pos, stepper, context) {
          const mapper = function (i, index) {
            return stepper.step(i, to[index], pos, context[index], context)
          };

          return this.fromArray(from.map(mapper))
        }
      });
    }

    class Path extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('path', node), attrs);
      }

      // Get array
      array () {
        return this._array || (this._array = new PathArray(this.attr('d')))
      }

      // Clear array cache
      clear () {
        delete this._array;
        return this
      }

      // Set height of element
      height (height) {
        return height == null ? this.bbox().height : this.size(this.bbox().width, height)
      }

      // Move by left top corner
      move (x, y) {
        return this.attr('d', this.array().move(x, y))
      }

      // Plot new path
      plot (d) {
        return (d == null)
          ? this.array()
          : this.clear().attr('d', typeof d === 'string' ? d : (this._array = new PathArray(d)))
      }

      // Set element size to given width and height
      size (width, height) {
        const p = proportionalSize(this, width, height);
        return this.attr('d', this.array().size(p.width, p.height))
      }

      // Set width of element
      width (width) {
        return width == null ? this.bbox().width : this.size(width, this.bbox().height)
      }

      // Move by left top corner over x-axis
      x (x) {
        return x == null ? this.bbox().x : this.move(x, this.bbox().y)
      }

      // Move by left top corner over y-axis
      y (y) {
        return y == null ? this.bbox().y : this.move(this.bbox().x, y)
      }

    }

    // Define morphable array
    Path.prototype.MorphArray = PathArray;

    // Add parent method
    registerMethods({
      Container: {
        // Create a wrapped path element
        path: wrapWithAttrCheck(function (d) {
          // make sure plot is called as a setter
          return this.put(new Path()).plot(d || new PathArray())
        })
      }
    });

    register(Path, 'Path');

    // Get array
    function array () {
      return this._array || (this._array = new PointArray(this.attr('points')))
    }

    // Clear array cache
    function clear () {
      delete this._array;
      return this
    }

    // Move by left top corner
    function move (x, y) {
      return this.attr('points', this.array().move(x, y))
    }

    // Plot new path
    function plot (p) {
      return (p == null)
        ? this.array()
        : this.clear().attr('points', typeof p === 'string'
          ? p
          : (this._array = new PointArray(p)))
    }

    // Set element size to given width and height
    function size (width, height) {
      const p = proportionalSize(this, width, height);
      return this.attr('points', this.array().size(p.width, p.height))
    }

    var poly = /*#__PURE__*/Object.freeze({
        __proto__: null,
        array: array,
        clear: clear,
        move: move,
        plot: plot,
        size: size
    });

    class Polygon extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('polygon', node), attrs);
      }
    }

    registerMethods({
      Container: {
        // Create a wrapped polygon element
        polygon: wrapWithAttrCheck(function (p) {
          // make sure plot is called as a setter
          return this.put(new Polygon()).plot(p || new PointArray())
        })
      }
    });

    extend(Polygon, pointed);
    extend(Polygon, poly);
    register(Polygon, 'Polygon');

    class Polyline extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('polyline', node), attrs);
      }
    }

    registerMethods({
      Container: {
        // Create a wrapped polygon element
        polyline: wrapWithAttrCheck(function (p) {
          // make sure plot is called as a setter
          return this.put(new Polyline()).plot(p || new PointArray())
        })
      }
    });

    extend(Polyline, pointed);
    extend(Polyline, poly);
    register(Polyline, 'Polyline');

    class Rect extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('rect', node), attrs);
      }
    }

    extend(Rect, { rx, ry });

    registerMethods({
      Container: {
        // Create a rect element
        rect: wrapWithAttrCheck(function (width, height) {
          return this.put(new Rect()).size(width, height)
        })
      }
    });

    register(Rect, 'Rect');

    class Queue {
      constructor () {
        this._first = null;
        this._last = null;
      }

      // Shows us the first item in the list
      first () {
        return this._first && this._first.value
      }

      // Shows us the last item in the list
      last () {
        return this._last && this._last.value
      }

      push (value) {
        // An item stores an id and the provided value
        const item = typeof value.next !== 'undefined' ? value : { value: value, next: null, prev: null };

        // Deal with the queue being empty or populated
        if (this._last) {
          item.prev = this._last;
          this._last.next = item;
          this._last = item;
        } else {
          this._last = item;
          this._first = item;
        }

        // Return the current item
        return item
      }

      // Removes the item that was returned from the push
      remove (item) {
        // Relink the previous item
        if (item.prev) item.prev.next = item.next;
        if (item.next) item.next.prev = item.prev;
        if (item === this._last) this._last = item.prev;
        if (item === this._first) this._first = item.next;

        // Invalidate item
        item.prev = null;
        item.next = null;
      }

      shift () {
        // Check if we have a value
        const remove = this._first;
        if (!remove) return null

        // If we do, remove it and relink things
        this._first = remove.next;
        if (this._first) this._first.prev = null;
        this._last = this._first ? this._last : null;
        return remove.value
      }

    }

    const Animator = {
      nextDraw: null,
      frames: new Queue(),
      timeouts: new Queue(),
      immediates: new Queue(),
      timer: () => globals.window.performance || globals.window.Date,
      transforms: [],

      frame (fn) {
        // Store the node
        const node = Animator.frames.push({ run: fn });

        // Request an animation frame if we don't have one
        if (Animator.nextDraw === null) {
          Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
        }

        // Return the node so we can remove it easily
        return node
      },

      timeout (fn, delay) {
        delay = delay || 0;

        // Work out when the event should fire
        const time = Animator.timer().now() + delay;

        // Add the timeout to the end of the queue
        const node = Animator.timeouts.push({ run: fn, time: time });

        // Request another animation frame if we need one
        if (Animator.nextDraw === null) {
          Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
        }

        return node
      },

      immediate (fn) {
        // Add the immediate fn to the end of the queue
        const node = Animator.immediates.push(fn);
        // Request another animation frame if we need one
        if (Animator.nextDraw === null) {
          Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
        }

        return node
      },

      cancelFrame (node) {
        node != null && Animator.frames.remove(node);
      },

      clearTimeout (node) {
        node != null && Animator.timeouts.remove(node);
      },

      cancelImmediate (node) {
        node != null && Animator.immediates.remove(node);
      },

      _draw (now) {
        // Run all the timeouts we can run, if they are not ready yet, add them
        // to the end of the queue immediately! (bad timeouts!!! [sarcasm])
        let nextTimeout = null;
        const lastTimeout = Animator.timeouts.last();
        while ((nextTimeout = Animator.timeouts.shift())) {
          // Run the timeout if its time, or push it to the end
          if (now >= nextTimeout.time) {
            nextTimeout.run();
          } else {
            Animator.timeouts.push(nextTimeout);
          }

          // If we hit the last item, we should stop shifting out more items
          if (nextTimeout === lastTimeout) break
        }

        // Run all of the animation frames
        let nextFrame = null;
        const lastFrame = Animator.frames.last();
        while ((nextFrame !== lastFrame) && (nextFrame = Animator.frames.shift())) {
          nextFrame.run(now);
        }

        let nextImmediate = null;
        while ((nextImmediate = Animator.immediates.shift())) {
          nextImmediate();
        }

        // If we have remaining timeouts or frames, draw until we don't anymore
        Animator.nextDraw = Animator.timeouts.first() || Animator.frames.first()
          ? globals.window.requestAnimationFrame(Animator._draw)
          : null;
      }
    };

    const makeSchedule = function (runnerInfo) {
      const start = runnerInfo.start;
      const duration = runnerInfo.runner.duration();
      const end = start + duration;
      return { start: start, duration: duration, end: end, runner: runnerInfo.runner }
    };

    const defaultSource = function () {
      const w = globals.window;
      return (w.performance || w.Date).now()
    };

    class Timeline extends EventTarget {
      // Construct a new timeline on the given element
      constructor (timeSource = defaultSource) {
        super();

        this._timeSource = timeSource;

        // Store the timing variables
        this._startTime = 0;
        this._speed = 1.0;

        // Determines how long a runner is hold in memory. Can be a dt or true/false
        this._persist = 0;

        // Keep track of the running animations and their starting parameters
        this._nextFrame = null;
        this._paused = true;
        this._runners = [];
        this._runnerIds = [];
        this._lastRunnerId = -1;
        this._time = 0;
        this._lastSourceTime = 0;
        this._lastStepTime = 0;

        // Make sure that step is always called in class context
        this._step = this._stepFn.bind(this, false);
        this._stepImmediate = this._stepFn.bind(this, true);
      }

      active () {
        return !!this._nextFrame
      }

      finish () {
        // Go to end and pause
        this.time(this.getEndTimeOfTimeline() + 1);
        return this.pause()
      }

      // Calculates the end of the timeline
      getEndTime () {
        const lastRunnerInfo = this.getLastRunnerInfo();
        const lastDuration = lastRunnerInfo ? lastRunnerInfo.runner.duration() : 0;
        const lastStartTime = lastRunnerInfo ? lastRunnerInfo.start : this._time;
        return lastStartTime + lastDuration
      }

      getEndTimeOfTimeline () {
        const endTimes = this._runners.map((i) => i.start + i.runner.duration());
        return Math.max(0, ...endTimes)
      }

      getLastRunnerInfo () {
        return this.getRunnerInfoById(this._lastRunnerId)
      }

      getRunnerInfoById (id) {
        return this._runners[this._runnerIds.indexOf(id)] || null
      }

      pause () {
        this._paused = true;
        return this._continue()
      }

      persist (dtOrForever) {
        if (dtOrForever == null) return this._persist
        this._persist = dtOrForever;
        return this
      }

      play () {
        // Now make sure we are not paused and continue the animation
        this._paused = false;
        return this.updateTime()._continue()
      }

      reverse (yes) {
        const currentSpeed = this.speed();
        if (yes == null) return this.speed(-currentSpeed)

        const positive = Math.abs(currentSpeed);
        return this.speed(yes ? -positive : positive)
      }

      // schedules a runner on the timeline
      schedule (runner, delay, when) {
        if (runner == null) {
          return this._runners.map(makeSchedule)
        }

        // The start time for the next animation can either be given explicitly,
        // derived from the current timeline time or it can be relative to the
        // last start time to chain animations directly

        let absoluteStartTime = 0;
        const endTime = this.getEndTime();
        delay = delay || 0;

        // Work out when to start the animation
        if (when == null || when === 'last' || when === 'after') {
          // Take the last time and increment
          absoluteStartTime = endTime;
        } else if (when === 'absolute' || when === 'start') {
          absoluteStartTime = delay;
          delay = 0;
        } else if (when === 'now') {
          absoluteStartTime = this._time;
        } else if (when === 'relative') {
          const runnerInfo = this.getRunnerInfoById(runner.id);
          if (runnerInfo) {
            absoluteStartTime = runnerInfo.start + delay;
            delay = 0;
          }
        } else if (when === 'with-last') {
          const lastRunnerInfo = this.getLastRunnerInfo();
          const lastStartTime = lastRunnerInfo ? lastRunnerInfo.start : this._time;
          absoluteStartTime = lastStartTime;
        } else {
          throw new Error('Invalid value for the "when" parameter')
        }

        // Manage runner
        runner.unschedule();
        runner.timeline(this);

        const persist = runner.persist();
        const runnerInfo = {
          persist: persist === null ? this._persist : persist,
          start: absoluteStartTime + delay,
          runner
        };

        this._lastRunnerId = runner.id;

        this._runners.push(runnerInfo);
        this._runners.sort((a, b) => a.start - b.start);
        this._runnerIds = this._runners.map(info => info.runner.id);

        this.updateTime()._continue();
        return this
      }

      seek (dt) {
        return this.time(this._time + dt)
      }

      source (fn) {
        if (fn == null) return this._timeSource
        this._timeSource = fn;
        return this
      }

      speed (speed) {
        if (speed == null) return this._speed
        this._speed = speed;
        return this
      }

      stop () {
        // Go to start and pause
        this.time(0);
        return this.pause()
      }

      time (time) {
        if (time == null) return this._time
        this._time = time;
        return this._continue(true)
      }

      // Remove the runner from this timeline
      unschedule (runner) {
        const index = this._runnerIds.indexOf(runner.id);
        if (index < 0) return this

        this._runners.splice(index, 1);
        this._runnerIds.splice(index, 1);

        runner.timeline(null);
        return this
      }

      // Makes sure, that after pausing the time doesn't jump
      updateTime () {
        if (!this.active()) {
          this._lastSourceTime = this._timeSource();
        }
        return this
      }

      // Checks if we are running and continues the animation
      _continue (immediateStep = false) {
        Animator.cancelFrame(this._nextFrame);
        this._nextFrame = null;

        if (immediateStep) return this._stepImmediate()
        if (this._paused) return this

        this._nextFrame = Animator.frame(this._step);
        return this
      }

      _stepFn (immediateStep = false) {
        // Get the time delta from the last time and update the time
        const time = this._timeSource();
        let dtSource = time - this._lastSourceTime;

        if (immediateStep) dtSource = 0;

        const dtTime = this._speed * dtSource + (this._time - this._lastStepTime);
        this._lastSourceTime = time;

        // Only update the time if we use the timeSource.
        // Otherwise use the current time
        if (!immediateStep) {
          // Update the time
          this._time += dtTime;
          this._time = this._time < 0 ? 0 : this._time;
        }
        this._lastStepTime = this._time;
        this.fire('time', this._time);

        // This is for the case that the timeline was seeked so that the time
        // is now before the startTime of the runner. Thats why we need to set
        // the runner to position 0

        // FIXME:
        // However, reseting in insertion order leads to bugs. Considering the case,
        // where 2 runners change the same attribute but in different times,
        // reseting both of them will lead to the case where the later defined
        // runner always wins the reset even if the other runner started earlier
        // and therefore should win the attribute battle
        // this can be solved by reseting them backwards
        for (let k = this._runners.length; k--;) {
          // Get and run the current runner and ignore it if its inactive
          const runnerInfo = this._runners[k];
          const runner = runnerInfo.runner;

          // Make sure that we give the actual difference
          // between runner start time and now
          const dtToStart = this._time - runnerInfo.start;

          // Dont run runner if not started yet
          // and try to reset it
          if (dtToStart <= 0) {
            runner.reset();
          }
        }

        // Run all of the runners directly
        let runnersLeft = false;
        for (let i = 0, len = this._runners.length; i < len; i++) {
          // Get and run the current runner and ignore it if its inactive
          const runnerInfo = this._runners[i];
          const runner = runnerInfo.runner;
          let dt = dtTime;

          // Make sure that we give the actual difference
          // between runner start time and now
          const dtToStart = this._time - runnerInfo.start;

          // Dont run runner if not started yet
          if (dtToStart <= 0) {
            runnersLeft = true;
            continue
          } else if (dtToStart < dt) {
            // Adjust dt to make sure that animation is on point
            dt = dtToStart;
          }

          if (!runner.active()) continue

          // If this runner is still going, signal that we need another animation
          // frame, otherwise, remove the completed runner
          const finished = runner.step(dt).done;
          if (!finished) {
            runnersLeft = true;
            // continue
          } else if (runnerInfo.persist !== true) {
            // runner is finished. And runner might get removed
            const endTime = runner.duration() - runner.time() + this._time;

            if (endTime + runnerInfo.persist < this._time) {
              // Delete runner and correct index
              runner.unschedule();
              --i;
              --len;
            }
          }
        }

        // Basically: we continue when there are runners right from us in time
        // when -->, and when runners are left from us when <--
        if ((runnersLeft && !(this._speed < 0 && this._time === 0)) || (this._runnerIds.length && this._speed < 0 && this._time > 0)) {
          this._continue();
        } else {
          this.pause();
          this.fire('finished');
        }

        return this
      }

    }

    registerMethods({
      Element: {
        timeline: function (timeline) {
          if (timeline == null) {
            this._timeline = (this._timeline || new Timeline());
            return this._timeline
          } else {
            this._timeline = timeline;
            return this
          }
        }
      }
    });

    class Runner extends EventTarget {
      constructor (options) {
        super();

        // Store a unique id on the runner, so that we can identify it later
        this.id = Runner.id++;

        // Ensure a default value
        options = options == null
          ? timeline.duration
          : options;

        // Ensure that we get a controller
        options = typeof options === 'function'
          ? new Controller(options)
          : options;

        // Declare all of the variables
        this._element = null;
        this._timeline = null;
        this.done = false;
        this._queue = [];

        // Work out the stepper and the duration
        this._duration = typeof options === 'number' && options;
        this._isDeclarative = options instanceof Controller;
        this._stepper = this._isDeclarative ? options : new Ease();

        // We copy the current values from the timeline because they can change
        this._history = {};

        // Store the state of the runner
        this.enabled = true;
        this._time = 0;
        this._lastTime = 0;

        // At creation, the runner is in reseted state
        this._reseted = true;

        // Save transforms applied to this runner
        this.transforms = new Matrix();
        this.transformId = 1;

        // Looping variables
        this._haveReversed = false;
        this._reverse = false;
        this._loopsDone = 0;
        this._swing = false;
        this._wait = 0;
        this._times = 1;

        this._frameId = null;

        // Stores how long a runner is stored after beeing done
        this._persist = this._isDeclarative ? true : null;
      }

      static sanitise (duration, delay, when) {
        // Initialise the default parameters
        let times = 1;
        let swing = false;
        let wait = 0;
        duration = duration || timeline.duration;
        delay = delay || timeline.delay;
        when = when || 'last';

        // If we have an object, unpack the values
        if (typeof duration === 'object' && !(duration instanceof Stepper)) {
          delay = duration.delay || delay;
          when = duration.when || when;
          swing = duration.swing || swing;
          times = duration.times || times;
          wait = duration.wait || wait;
          duration = duration.duration || timeline.duration;
        }

        return {
          duration: duration,
          delay: delay,
          swing: swing,
          times: times,
          wait: wait,
          when: when
        }
      }

      active (enabled) {
        if (enabled == null) return this.enabled
        this.enabled = enabled;
        return this
      }

      /*
      Private Methods
      ===============
      Methods that shouldn't be used externally
      */
      addTransform (transform, index) {
        this.transforms.lmultiplyO(transform);
        return this
      }

      after (fn) {
        return this.on('finished', fn)
      }

      animate (duration, delay, when) {
        const o = Runner.sanitise(duration, delay, when);
        const runner = new Runner(o.duration);
        if (this._timeline) runner.timeline(this._timeline);
        if (this._element) runner.element(this._element);
        return runner.loop(o).schedule(o.delay, o.when)
      }

      clearTransform () {
        this.transforms = new Matrix();
        return this
      }

      // TODO: Keep track of all transformations so that deletion is faster
      clearTransformsFromQueue () {
        if (!this.done || !this._timeline || !this._timeline._runnerIds.includes(this.id)) {
          this._queue = this._queue.filter((item) => {
            return !item.isTransform
          });
        }
      }

      delay (delay) {
        return this.animate(0, delay)
      }

      duration () {
        return this._times * (this._wait + this._duration) - this._wait
      }

      during (fn) {
        return this.queue(null, fn)
      }

      ease (fn) {
        this._stepper = new Ease(fn);
        return this
      }
      /*
      Runner Definitions
      ==================
      These methods help us define the runtime behaviour of the Runner or they
      help us make new runners from the current runner
      */

      element (element) {
        if (element == null) return this._element
        this._element = element;
        element._prepareRunner();
        return this
      }

      finish () {
        return this.step(Infinity)
      }

      loop (times, swing, wait) {
        // Deal with the user passing in an object
        if (typeof times === 'object') {
          swing = times.swing;
          wait = times.wait;
          times = times.times;
        }

        // Sanitise the values and store them
        this._times = times || Infinity;
        this._swing = swing || false;
        this._wait = wait || 0;

        // Allow true to be passed
        if (this._times === true) { this._times = Infinity; }

        return this
      }

      loops (p) {
        const loopDuration = this._duration + this._wait;
        if (p == null) {
          const loopsDone = Math.floor(this._time / loopDuration);
          const relativeTime = (this._time - loopsDone * loopDuration);
          const position = relativeTime / this._duration;
          return Math.min(loopsDone + position, this._times)
        }
        const whole = Math.floor(p);
        const partial = p % 1;
        const time = loopDuration * whole + this._duration * partial;
        return this.time(time)
      }

      persist (dtOrForever) {
        if (dtOrForever == null) return this._persist
        this._persist = dtOrForever;
        return this
      }

      position (p) {
        // Get all of the variables we need
        const x = this._time;
        const d = this._duration;
        const w = this._wait;
        const t = this._times;
        const s = this._swing;
        const r = this._reverse;
        let position;

        if (p == null) {
          /*
          This function converts a time to a position in the range [0, 1]
          The full explanation can be found in this desmos demonstration
            https://www.desmos.com/calculator/u4fbavgche
          The logic is slightly simplified here because we can use booleans
          */

          // Figure out the value without thinking about the start or end time
          const f = function (x) {
            const swinging = s * Math.floor(x % (2 * (w + d)) / (w + d));
            const backwards = (swinging && !r) || (!swinging && r);
            const uncliped = Math.pow(-1, backwards) * (x % (w + d)) / d + backwards;
            const clipped = Math.max(Math.min(uncliped, 1), 0);
            return clipped
          };

          // Figure out the value by incorporating the start time
          const endTime = t * (w + d) - w;
          position = x <= 0
            ? Math.round(f(1e-5))
            : x < endTime
              ? f(x)
              : Math.round(f(endTime - 1e-5));
          return position
        }

        // Work out the loops done and add the position to the loops done
        const loopsDone = Math.floor(this.loops());
        const swingForward = s && (loopsDone % 2 === 0);
        const forwards = (swingForward && !r) || (r && swingForward);
        position = loopsDone + (forwards ? p : 1 - p);
        return this.loops(position)
      }

      progress (p) {
        if (p == null) {
          return Math.min(1, this._time / this.duration())
        }
        return this.time(p * this.duration())
      }

      /*
      Basic Functionality
      ===================
      These methods allow us to attach basic functions to the runner directly
      */
      queue (initFn, runFn, retargetFn, isTransform) {
        this._queue.push({
          initialiser: initFn || noop$1,
          runner: runFn || noop$1,
          retarget: retargetFn,
          isTransform: isTransform,
          initialised: false,
          finished: false
        });
        const timeline = this.timeline();
        timeline && this.timeline()._continue();
        return this
      }

      reset () {
        if (this._reseted) return this
        this.time(0);
        this._reseted = true;
        return this
      }

      reverse (reverse) {
        this._reverse = reverse == null ? !this._reverse : reverse;
        return this
      }

      schedule (timeline, delay, when) {
        // The user doesn't need to pass a timeline if we already have one
        if (!(timeline instanceof Timeline)) {
          when = delay;
          delay = timeline;
          timeline = this.timeline();
        }

        // If there is no timeline, yell at the user...
        if (!timeline) {
          throw Error('Runner cannot be scheduled without timeline')
        }

        // Schedule the runner on the timeline provided
        timeline.schedule(this, delay, when);
        return this
      }

      step (dt) {
        // If we are inactive, this stepper just gets skipped
        if (!this.enabled) return this

        // Update the time and get the new position
        dt = dt == null ? 16 : dt;
        this._time += dt;
        const position = this.position();

        // Figure out if we need to run the stepper in this frame
        const running = this._lastPosition !== position && this._time >= 0;
        this._lastPosition = position;

        // Figure out if we just started
        const duration = this.duration();
        const justStarted = this._lastTime <= 0 && this._time > 0;
        const justFinished = this._lastTime < duration && this._time >= duration;

        this._lastTime = this._time;
        if (justStarted) {
          this.fire('start', this);
        }

        // Work out if the runner is finished set the done flag here so animations
        // know, that they are running in the last step (this is good for
        // transformations which can be merged)
        const declarative = this._isDeclarative;
        this.done = !declarative && !justFinished && this._time >= duration;

        // Runner is running. So its not in reseted state anymore
        this._reseted = false;

        let converged = false;
        // Call initialise and the run function
        if (running || declarative) {
          this._initialise(running);

          // clear the transforms on this runner so they dont get added again and again
          this.transforms = new Matrix();
          converged = this._run(declarative ? dt : position);

          this.fire('step', this);
        }
        // correct the done flag here
        // declaritive animations itself know when they converged
        this.done = this.done || (converged && declarative);
        if (justFinished) {
          this.fire('finished', this);
        }
        return this
      }

      /*
      Runner animation methods
      ========================
      Control how the animation plays
      */
      time (time) {
        if (time == null) {
          return this._time
        }
        const dt = time - this._time;
        this.step(dt);
        return this
      }

      timeline (timeline) {
        // check explicitly for undefined so we can set the timeline to null
        if (typeof timeline === 'undefined') return this._timeline
        this._timeline = timeline;
        return this
      }

      unschedule () {
        const timeline = this.timeline();
        timeline && timeline.unschedule(this);
        return this
      }

      // Run each initialise function in the runner if required
      _initialise (running) {
        // If we aren't running, we shouldn't initialise when not declarative
        if (!running && !this._isDeclarative) return

        // Loop through all of the initialisers
        for (let i = 0, len = this._queue.length; i < len; ++i) {
          // Get the current initialiser
          const current = this._queue[i];

          // Determine whether we need to initialise
          const needsIt = this._isDeclarative || (!current.initialised && running);
          running = !current.finished;

          // Call the initialiser if we need to
          if (needsIt && running) {
            current.initialiser.call(this);
            current.initialised = true;
          }
        }
      }

      // Save a morpher to the morpher list so that we can retarget it later
      _rememberMorpher (method, morpher) {
        this._history[method] = {
          morpher: morpher,
          caller: this._queue[this._queue.length - 1]
        };

        // We have to resume the timeline in case a controller
        // is already done without being ever run
        // This can happen when e.g. this is done:
        //    anim = el.animate(new SVG.Spring)
        // and later
        //    anim.move(...)
        if (this._isDeclarative) {
          const timeline = this.timeline();
          timeline && timeline.play();
        }
      }

      // Try to set the target for a morpher if the morpher exists, otherwise
      // Run each run function for the position or dt given
      _run (positionOrDt) {
        // Run all of the _queue directly
        let allfinished = true;
        for (let i = 0, len = this._queue.length; i < len; ++i) {
          // Get the current function to run
          const current = this._queue[i];

          // Run the function if its not finished, we keep track of the finished
          // flag for the sake of declarative _queue
          const converged = current.runner.call(this, positionOrDt);
          current.finished = current.finished || (converged === true);
          allfinished = allfinished && current.finished;
        }

        // We report when all of the constructors are finished
        return allfinished
      }

      // do nothing and return false
      _tryRetarget (method, target, extra) {
        if (this._history[method]) {
          // if the last method wasnt even initialised, throw it away
          if (!this._history[method].caller.initialised) {
            const index = this._queue.indexOf(this._history[method].caller);
            this._queue.splice(index, 1);
            return false
          }

          // for the case of transformations, we use the special retarget function
          // which has access to the outer scope
          if (this._history[method].caller.retarget) {
            this._history[method].caller.retarget.call(this, target, extra);
            // for everything else a simple morpher change is sufficient
          } else {
            this._history[method].morpher.to(target);
          }

          this._history[method].caller.finished = false;
          const timeline = this.timeline();
          timeline && timeline.play();
          return true
        }
        return false
      }

    }

    Runner.id = 0;

    class FakeRunner {
      constructor (transforms = new Matrix(), id = -1, done = true) {
        this.transforms = transforms;
        this.id = id;
        this.done = done;
      }

      clearTransformsFromQueue () { }
    }

    extend([ Runner, FakeRunner ], {
      mergeWith (runner) {
        return new FakeRunner(
          runner.transforms.lmultiply(this.transforms),
          runner.id
        )
      }
    });

    // FakeRunner.emptyRunner = new FakeRunner()

    const lmultiply = (last, curr) => last.lmultiplyO(curr);
    const getRunnerTransform = (runner) => runner.transforms;

    function mergeTransforms () {
      // Find the matrix to apply to the element and apply it
      const runners = this._transformationRunners.runners;
      const netTransform = runners
        .map(getRunnerTransform)
        .reduce(lmultiply, new Matrix());

      this.transform(netTransform);

      this._transformationRunners.merge();

      if (this._transformationRunners.length() === 1) {
        this._frameId = null;
      }
    }

    class RunnerArray {
      constructor () {
        this.runners = [];
        this.ids = [];
      }

      add (runner) {
        if (this.runners.includes(runner)) return
        const id = runner.id + 1;

        this.runners.push(runner);
        this.ids.push(id);

        return this
      }

      clearBefore (id) {
        const deleteCnt = this.ids.indexOf(id + 1) || 1;
        this.ids.splice(0, deleteCnt, 0);
        this.runners.splice(0, deleteCnt, new FakeRunner())
          .forEach((r) => r.clearTransformsFromQueue());
        return this
      }

      edit (id, newRunner) {
        const index = this.ids.indexOf(id + 1);
        this.ids.splice(index, 1, id + 1);
        this.runners.splice(index, 1, newRunner);
        return this
      }

      getByID (id) {
        return this.runners[this.ids.indexOf(id + 1)]
      }

      length () {
        return this.ids.length
      }

      merge () {
        let lastRunner = null;
        for (let i = 0; i < this.runners.length; ++i) {
          const runner = this.runners[i];

          const condition = lastRunner
            && runner.done && lastRunner.done
            // don't merge runner when persisted on timeline
            && (!runner._timeline || !runner._timeline._runnerIds.includes(runner.id))
            && (!lastRunner._timeline || !lastRunner._timeline._runnerIds.includes(lastRunner.id));

          if (condition) {
            // the +1 happens in the function
            this.remove(runner.id);
            const newRunner = runner.mergeWith(lastRunner);
            this.edit(lastRunner.id, newRunner);
            lastRunner = newRunner;
            --i;
          } else {
            lastRunner = runner;
          }
        }

        return this
      }

      remove (id) {
        const index = this.ids.indexOf(id + 1);
        this.ids.splice(index, 1);
        this.runners.splice(index, 1);
        return this
      }

    }

    registerMethods({
      Element: {
        animate (duration, delay, when) {
          const o = Runner.sanitise(duration, delay, when);
          const timeline = this.timeline();
          return new Runner(o.duration)
            .loop(o)
            .element(this)
            .timeline(timeline.play())
            .schedule(o.delay, o.when)
        },

        delay (by, when) {
          return this.animate(0, by, when)
        },

        // this function searches for all runners on the element and deletes the ones
        // which run before the current one. This is because absolute transformations
        // overwfrite anything anyway so there is no need to waste time computing
        // other runners
        _clearTransformRunnersBefore (currentRunner) {
          this._transformationRunners.clearBefore(currentRunner.id);
        },

        _currentTransform (current) {
          return this._transformationRunners.runners
            // we need the equal sign here to make sure, that also transformations
            // on the same runner which execute before the current transformation are
            // taken into account
            .filter((runner) => runner.id <= current.id)
            .map(getRunnerTransform)
            .reduce(lmultiply, new Matrix())
        },

        _addRunner (runner) {
          this._transformationRunners.add(runner);

          // Make sure that the runner merge is executed at the very end of
          // all Animator functions. Thats why we use immediate here to execute
          // the merge right after all frames are run
          Animator.cancelImmediate(this._frameId);
          this._frameId = Animator.immediate(mergeTransforms.bind(this));
        },

        _prepareRunner () {
          if (this._frameId == null) {
            this._transformationRunners = new RunnerArray()
              .add(new FakeRunner(new Matrix(this)));
          }
        }
      }
    });

    // Will output the elements from array A that are not in the array B
    const difference = (a, b) => a.filter(x => !b.includes(x));

    extend(Runner, {
      attr (a, v) {
        return this.styleAttr('attr', a, v)
      },

      // Add animatable styles
      css (s, v) {
        return this.styleAttr('css', s, v)
      },

      styleAttr (type, nameOrAttrs, val) {
        if (typeof nameOrAttrs === 'string') {
          return this.styleAttr(type, { [nameOrAttrs]: val })
        }

        let attrs = nameOrAttrs;
        if (this._tryRetarget(type, attrs)) return this

        let morpher = new Morphable(this._stepper).to(attrs);
        let keys = Object.keys(attrs);

        this.queue(function () {
          morpher = morpher.from(this.element()[type](keys));
        }, function (pos) {
          this.element()[type](morpher.at(pos).valueOf());
          return morpher.done()
        }, function (newToAttrs) {

          // Check if any new keys were added
          const newKeys = Object.keys(newToAttrs);
          const differences = difference(newKeys, keys);

          // If their are new keys, initialize them and add them to morpher
          if (differences.length) {
            // Get the values
            const addedFromAttrs = this.element()[type](differences);

            // Get the already initialized values
            const oldFromAttrs = new ObjectBag(morpher.from()).valueOf();

            // Merge old and new
            Object.assign(oldFromAttrs, addedFromAttrs);
            morpher.from(oldFromAttrs);
          }

          // Get the object from the morpher
          const oldToAttrs = new ObjectBag(morpher.to()).valueOf();

          // Merge in new attributes
          Object.assign(oldToAttrs, newToAttrs);

          // Change morpher target
          morpher.to(oldToAttrs);

          // Make sure that we save the work we did so we don't need it to do again
          keys = newKeys;
          attrs = newToAttrs;
        });

        this._rememberMorpher(type, morpher);
        return this
      },

      zoom (level, point) {
        if (this._tryRetarget('zoom', level, point)) return this

        let morpher = new Morphable(this._stepper).to(new SVGNumber(level));

        this.queue(function () {
          morpher = morpher.from(this.element().zoom());
        }, function (pos) {
          this.element().zoom(morpher.at(pos), point);
          return morpher.done()
        }, function (newLevel, newPoint) {
          point = newPoint;
          morpher.to(newLevel);
        });

        this._rememberMorpher('zoom', morpher);
        return this
      },

      /**
       ** absolute transformations
       **/

      //
      // M v -----|-----(D M v = F v)------|----->  T v
      //
      // 1. define the final state (T) and decompose it (once)
      //    t = [tx, ty, the, lam, sy, sx]
      // 2. on every frame: pull the current state of all previous transforms
      //    (M - m can change)
      //   and then write this as m = [tx0, ty0, the0, lam0, sy0, sx0]
      // 3. Find the interpolated matrix F(pos) = m + pos * (t - m)
      //   - Note F(0) = M
      //   - Note F(1) = T
      // 4. Now you get the delta matrix as a result: D = F * inv(M)

      transform (transforms, relative, affine) {
        // If we have a declarative function, we should retarget it if possible
        relative = transforms.relative || relative;
        if (this._isDeclarative && !relative && this._tryRetarget('transform', transforms)) {
          return this
        }

        // Parse the parameters
        const isMatrix = Matrix.isMatrixLike(transforms);
        affine = transforms.affine != null
          ? transforms.affine
          : (affine != null ? affine : !isMatrix);

        // Create a morepher and set its type
        const morpher = new Morphable(this._stepper)
          .type(affine ? TransformBag : Matrix);

        let origin;
        let element;
        let current;
        let currentAngle;
        let startTransform;

        function setup () {
          // make sure element and origin is defined
          element = element || this.element();
          origin = origin || getOrigin(transforms, element);

          startTransform = new Matrix(relative ? undefined : element);

          // add the runner to the element so it can merge transformations
          element._addRunner(this);

          // Deactivate all transforms that have run so far if we are absolute
          if (!relative) {
            element._clearTransformRunnersBefore(this);
          }
        }

        function run (pos) {
          // clear all other transforms before this in case something is saved
          // on this runner. We are absolute. We dont need these!
          if (!relative) this.clearTransform();

          const { x, y } = new Point(origin).transform(element._currentTransform(this));

          let target = new Matrix({ ...transforms, origin: [ x, y ] });
          let start = this._isDeclarative && current
            ? current
            : startTransform;

          if (affine) {
            target = target.decompose(x, y);
            start = start.decompose(x, y);

            // Get the current and target angle as it was set
            const rTarget = target.rotate;
            const rCurrent = start.rotate;

            // Figure out the shortest path to rotate directly
            const possibilities = [ rTarget - 360, rTarget, rTarget + 360 ];
            const distances = possibilities.map(a => Math.abs(a - rCurrent));
            const shortest = Math.min(...distances);
            const index = distances.indexOf(shortest);
            target.rotate = possibilities[index];
          }

          if (relative) {
            // we have to be careful here not to overwrite the rotation
            // with the rotate method of Matrix
            if (!isMatrix) {
              target.rotate = transforms.rotate || 0;
            }
            if (this._isDeclarative && currentAngle) {
              start.rotate = currentAngle;
            }
          }

          morpher.from(start);
          morpher.to(target);

          const affineParameters = morpher.at(pos);
          currentAngle = affineParameters.rotate;
          current = new Matrix(affineParameters);

          this.addTransform(current);
          element._addRunner(this);
          return morpher.done()
        }

        function retarget (newTransforms) {
          // only get a new origin if it changed since the last call
          if (
            (newTransforms.origin || 'center').toString()
            !== (transforms.origin || 'center').toString()
          ) {
            origin = getOrigin(newTransforms, element);
          }

          // overwrite the old transformations with the new ones
          transforms = { ...newTransforms, origin };
        }

        this.queue(setup, run, retarget, true);
        this._isDeclarative && this._rememberMorpher('transform', morpher);
        return this
      },

      // Animatable x-axis
      x (x, relative) {
        return this._queueNumber('x', x)
      },

      // Animatable y-axis
      y (y) {
        return this._queueNumber('y', y)
      },

      dx (x = 0) {
        return this._queueNumberDelta('x', x)
      },

      dy (y = 0) {
        return this._queueNumberDelta('y', y)
      },

      dmove (x, y) {
        return this.dx(x).dy(y)
      },

      _queueNumberDelta (method, to) {
        to = new SVGNumber(to);

        // Try to change the target if we have this method already registerd
        if (this._tryRetarget(method, to)) return this

        // Make a morpher and queue the animation
        const morpher = new Morphable(this._stepper).to(to);
        let from = null;
        this.queue(function () {
          from = this.element()[method]();
          morpher.from(from);
          morpher.to(from + to);
        }, function (pos) {
          this.element()[method](morpher.at(pos));
          return morpher.done()
        }, function (newTo) {
          morpher.to(from + new SVGNumber(newTo));
        });

        // Register the morpher so that if it is changed again, we can retarget it
        this._rememberMorpher(method, morpher);
        return this
      },

      _queueObject (method, to) {
        // Try to change the target if we have this method already registerd
        if (this._tryRetarget(method, to)) return this

        // Make a morpher and queue the animation
        const morpher = new Morphable(this._stepper).to(to);
        this.queue(function () {
          morpher.from(this.element()[method]());
        }, function (pos) {
          this.element()[method](morpher.at(pos));
          return morpher.done()
        });

        // Register the morpher so that if it is changed again, we can retarget it
        this._rememberMorpher(method, morpher);
        return this
      },

      _queueNumber (method, value) {
        return this._queueObject(method, new SVGNumber(value))
      },

      // Animatable center x-axis
      cx (x) {
        return this._queueNumber('cx', x)
      },

      // Animatable center y-axis
      cy (y) {
        return this._queueNumber('cy', y)
      },

      // Add animatable move
      move (x, y) {
        return this.x(x).y(y)
      },

      // Add animatable center
      center (x, y) {
        return this.cx(x).cy(y)
      },

      // Add animatable size
      size (width, height) {
        // animate bbox based size for all other elements
        let box;

        if (!width || !height) {
          box = this._element.bbox();
        }

        if (!width) {
          width = box.width / box.height * height;
        }

        if (!height) {
          height = box.height / box.width * width;
        }

        return this
          .width(width)
          .height(height)
      },

      // Add animatable width
      width (width) {
        return this._queueNumber('width', width)
      },

      // Add animatable height
      height (height) {
        return this._queueNumber('height', height)
      },

      // Add animatable plot
      plot (a, b, c, d) {
        // Lines can be plotted with 4 arguments
        if (arguments.length === 4) {
          return this.plot([ a, b, c, d ])
        }

        if (this._tryRetarget('plot', a)) return this

        const morpher = new Morphable(this._stepper)
          .type(this._element.MorphArray).to(a);

        this.queue(function () {
          morpher.from(this._element.array());
        }, function (pos) {
          this._element.plot(morpher.at(pos));
          return morpher.done()
        });

        this._rememberMorpher('plot', morpher);
        return this
      },

      // Add leading method
      leading (value) {
        return this._queueNumber('leading', value)
      },

      // Add animatable viewbox
      viewbox (x, y, width, height) {
        return this._queueObject('viewbox', new Box(x, y, width, height))
      },

      update (o) {
        if (typeof o !== 'object') {
          return this.update({
            offset: arguments[0],
            color: arguments[1],
            opacity: arguments[2]
          })
        }

        if (o.opacity != null) this.attr('stop-opacity', o.opacity);
        if (o.color != null) this.attr('stop-color', o.color);
        if (o.offset != null) this.attr('offset', o.offset);

        return this
      }
    });

    extend(Runner, { rx, ry, from, to });
    register(Runner, 'Runner');

    class Svg extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('svg', node), attrs);
        this.namespace();
      }

      // Creates and returns defs element
      defs () {
        if (!this.isRoot()) return this.root().defs()

        return adopt(this.node.querySelector('defs'))
          || this.put(new Defs())
      }

      isRoot () {
        return !this.node.parentNode
          || (!(this.node.parentNode instanceof globals.window.SVGElement) && this.node.parentNode.nodeName !== '#document-fragment')
      }

      // Add namespaces
      namespace () {
        if (!this.isRoot()) return this.root().namespace()
        return this
          .attr({ xmlns: svg, version: '1.1' })
          .attr('xmlns:xlink', xlink, xmlns)
          .attr('xmlns:svgjs', svgjs, xmlns)
      }

      removeNamespace () {
        return this.attr({ xmlns: null, version: null })
          .attr('xmlns:xlink', null, xmlns)
          .attr('xmlns:svgjs', null, xmlns)
      }

      // Check if this is a root svg
      // If not, call root() from this element
      root () {
        if (this.isRoot()) return this
        return super.root()
      }

    }

    registerMethods({
      Container: {
        // Create nested svg document
        nested: wrapWithAttrCheck(function () {
          return this.put(new Svg())
        })
      }
    });

    register(Svg, 'Svg', true);

    class Symbol extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('symbol', node), attrs);
      }
    }

    registerMethods({
      Container: {
        symbol: wrapWithAttrCheck(function () {
          return this.put(new Symbol())
        })
      }
    });

    register(Symbol, 'Symbol');

    // Create plain text node
    function plain (text) {
      // clear if build mode is disabled
      if (this._build === false) {
        this.clear();
      }

      // create text node
      this.node.appendChild(globals.document.createTextNode(text));

      return this
    }

    // Get length of text element
    function length () {
      return this.node.getComputedTextLength()
    }

    // Move over x-axis
    // Text is moved by its bounding box
    // text-anchor does NOT matter
    function x$2 (x, box = this.bbox()) {
      if (x == null) {
        return box.x
      }

      return this.attr('x', this.attr('x') + x - box.x)
    }

    // Move over y-axis
    function y$2 (y, box = this.bbox()) {
      if (y == null) {
        return box.y
      }

      return this.attr('y', this.attr('y') + y - box.y)
    }

    function move$1 (x, y, box = this.bbox()) {
      return this.x(x, box).y(y, box)
    }

    // Move center over x-axis
    function cx$1 (x, box = this.bbox()) {
      if (x == null) {
        return box.cx
      }

      return this.attr('x', this.attr('x') + x - box.cx)
    }

    // Move center over y-axis
    function cy$1 (y, box = this.bbox()) {
      if (y == null) {
        return box.cy
      }

      return this.attr('y', this.attr('y') + y - box.cy)
    }

    function center (x, y, box = this.bbox()) {
      return this.cx(x, box).cy(y, box)
    }

    function ax (x) {
      return this.attr('x', x)
    }

    function ay (y) {
      return this.attr('y', y)
    }

    function amove (x, y) {
      return this.ax(x).ay(y)
    }

    // Enable / disable build mode
    function build (build) {
      this._build = !!build;
      return this
    }

    var textable = /*#__PURE__*/Object.freeze({
        __proto__: null,
        plain: plain,
        length: length,
        x: x$2,
        y: y$2,
        move: move$1,
        cx: cx$1,
        cy: cy$1,
        center: center,
        ax: ax,
        ay: ay,
        amove: amove,
        build: build
    });

    class Text extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('text', node), attrs);

        this.dom.leading = new SVGNumber(1.3); // store leading value for rebuilding
        this._rebuild = true; // enable automatic updating of dy values
        this._build = false; // disable build mode for adding multiple lines
      }

      // Set / get leading
      leading (value) {
        // act as getter
        if (value == null) {
          return this.dom.leading
        }

        // act as setter
        this.dom.leading = new SVGNumber(value);

        return this.rebuild()
      }

      // Rebuild appearance type
      rebuild (rebuild) {
        // store new rebuild flag if given
        if (typeof rebuild === 'boolean') {
          this._rebuild = rebuild;
        }

        // define position of all lines
        if (this._rebuild) {
          const self = this;
          let blankLineOffset = 0;
          const leading = this.dom.leading;

          this.each(function (i) {
            const fontSize = globals.window.getComputedStyle(this.node)
              .getPropertyValue('font-size');

            const dy = leading * new SVGNumber(fontSize);

            if (this.dom.newLined) {
              this.attr('x', self.attr('x'));

              if (this.text() === '\n') {
                blankLineOffset += dy;
              } else {
                this.attr('dy', i ? dy + blankLineOffset : 0);
                blankLineOffset = 0;
              }
            }
          });

          this.fire('rebuild');
        }

        return this
      }

      // overwrite method from parent to set data properly
      setData (o) {
        this.dom = o;
        this.dom.leading = new SVGNumber(o.leading || 1.3);
        return this
      }

      // Set the text content
      text (text) {
        // act as getter
        if (text === undefined) {
          const children = this.node.childNodes;
          let firstLine = 0;
          text = '';

          for (let i = 0, len = children.length; i < len; ++i) {
            // skip textPaths - they are no lines
            if (children[i].nodeName === 'textPath') {
              if (i === 0) firstLine = 1;
              continue
            }

            // add newline if its not the first child and newLined is set to true
            if (i !== firstLine && children[i].nodeType !== 3 && adopt(children[i]).dom.newLined === true) {
              text += '\n';
            }

            // add content of this node
            text += children[i].textContent;
          }

          return text
        }

        // remove existing content
        this.clear().build(true);

        if (typeof text === 'function') {
          // call block
          text.call(this, this);
        } else {
          // store text and make sure text is not blank
          text = (text + '').split('\n');

          // build new lines
          for (let j = 0, jl = text.length; j < jl; j++) {
            this.newLine(text[j]);
          }
        }

        // disable build mode and rebuild lines
        return this.build(false).rebuild()
      }

    }

    extend(Text, textable);

    registerMethods({
      Container: {
        // Create text element
        text: wrapWithAttrCheck(function (text = '') {
          return this.put(new Text()).text(text)
        }),

        // Create plain text element
        plain: wrapWithAttrCheck(function (text = '') {
          return this.put(new Text()).plain(text)
        })
      }
    });

    register(Text, 'Text');

    class Tspan extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('tspan', node), attrs);
        this._build = false; // disable build mode for adding multiple lines
      }

      // Shortcut dx
      dx (dx) {
        return this.attr('dx', dx)
      }

      // Shortcut dy
      dy (dy) {
        return this.attr('dy', dy)
      }

      // Create new line
      newLine () {
        // mark new line
        this.dom.newLined = true;

        // fetch parent
        const text = this.parent();

        // early return in case we are not in a text element
        if (!(text instanceof Text)) {
          return this
        }

        const i = text.index(this);

        const fontSize = globals.window.getComputedStyle(this.node)
          .getPropertyValue('font-size');
        const dy = text.dom.leading * new SVGNumber(fontSize);

        // apply new position
        return this.dy(i ? dy : 0).attr('x', text.x())
      }

      // Set text content
      text (text) {
        if (text == null) return this.node.textContent + (this.dom.newLined ? '\n' : '')

        if (typeof text === 'function') {
          this.clear().build(true);
          text.call(this, this);
          this.build(false);
        } else {
          this.plain(text);
        }

        return this
      }

    }

    extend(Tspan, textable);

    registerMethods({
      Tspan: {
        tspan: wrapWithAttrCheck(function (text = '') {
          const tspan = new Tspan();

          // clear if build mode is disabled
          if (!this._build) {
            this.clear();
          }

          // add new tspan
          return this.put(tspan).text(text)
        })
      },
      Text: {
        newLine: function (text = '') {
          return this.tspan(text).newLine()
        }
      }
    });

    register(Tspan, 'Tspan');

    class Circle extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('circle', node), attrs);
      }

      radius (r) {
        return this.attr('r', r)
      }

      // Radius x value
      rx (rx) {
        return this.attr('r', rx)
      }

      // Alias radius x value
      ry (ry) {
        return this.rx(ry)
      }

      size (size) {
        return this.radius(new SVGNumber(size).divide(2))
      }
    }

    extend(Circle, { x, y, cx, cy, width, height });

    registerMethods({
      Container: {
        // Create circle element
        circle: wrapWithAttrCheck(function (size = 0) {
          return this.put(new Circle())
            .size(size)
            .move(0, 0)
        })
      }
    });

    register(Circle, 'Circle');

    class ClipPath extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('clipPath', node), attrs);
      }

      // Unclip all clipped elements and remove itself
      remove () {
        // unclip all targets
        this.targets().forEach(function (el) {
          el.unclip();
        });

        // remove clipPath from parent
        return super.remove()
      }

      targets () {
        return baseFind('svg [clip-path*="' + this.id() + '"]')
      }
    }

    registerMethods({
      Container: {
        // Create clipping element
        clip: wrapWithAttrCheck(function () {
          return this.defs().put(new ClipPath())
        })
      },
      Element: {
        // Distribute clipPath to svg element
        clipper () {
          return this.reference('clip-path')
        },

        clipWith (element) {
          // use given clip or create a new one
          const clipper = element instanceof ClipPath
            ? element
            : this.parent().clip().add(element);

          // apply mask
          return this.attr('clip-path', 'url("#' + clipper.id() + '")')
        },

        // Unclip element
        unclip () {
          return this.attr('clip-path', null)
        }
      }
    });

    register(ClipPath, 'ClipPath');

    class ForeignObject extends Element {
      constructor (node, attrs = node) {
        super(nodeOrNew('foreignObject', node), attrs);
      }
    }

    registerMethods({
      Container: {
        foreignObject: wrapWithAttrCheck(function (width, height) {
          return this.put(new ForeignObject()).size(width, height)
        })
      }
    });

    register(ForeignObject, 'ForeignObject');

    function dmove (dx, dy) {
      this.children().forEach((child, i) => {

        let bbox;

        // We have to wrap this for elements that dont have a bbox
        // e.g. title and other descriptive elements
        try {
          // Get the childs bbox
          bbox = child.bbox();
        } catch (e) {
          return
        }

        // Get childs matrix
        const m = new Matrix(child);
        // Translate childs matrix by amount and
        // transform it back into parents space
        const matrix = m.translate(dx, dy).transform(m.inverse());
        // Calculate new x and y from old box
        const p = new Point(bbox.x, bbox.y).transform(matrix);
        // Move element
        child.move(p.x, p.y);
      });

      return this
    }

    function dx (dx) {
      return this.dmove(dx, 0)
    }

    function dy (dy) {
      return this.dmove(0, dy)
    }

    function height$2 (height, box = this.bbox()) {
      if (height == null) return box.height
      return this.size(box.width, height, box)
    }

    function move$2 (x = 0, y = 0, box = this.bbox()) {
      const dx = x - box.x;
      const dy = y - box.y;

      return this.dmove(dx, dy)
    }

    function size$1 (width, height, box = this.bbox()) {
      const p = proportionalSize(this, width, height, box);
      const scaleX = p.width / box.width;
      const scaleY = p.height / box.height;

      this.children().forEach((child, i) => {
        const o = new Point(box).transform(new Matrix(child).inverse());
        child.scale(scaleX, scaleY, o.x, o.y);
      });

      return this
    }

    function width$2 (width, box = this.bbox()) {
      if (width == null) return box.width
      return this.size(width, box.height, box)
    }

    function x$3 (x, box = this.bbox()) {
      if (x == null) return box.x
      return this.move(x, box.y, box)
    }

    function y$3 (y, box = this.bbox()) {
      if (y == null) return box.y
      return this.move(box.x, y, box)
    }

    var containerGeometry = /*#__PURE__*/Object.freeze({
        __proto__: null,
        dmove: dmove,
        dx: dx,
        dy: dy,
        height: height$2,
        move: move$2,
        size: size$1,
        width: width$2,
        x: x$3,
        y: y$3
    });

    class G extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('g', node), attrs);
      }
    }

    extend(G, containerGeometry);

    registerMethods({
      Container: {
        // Create a group element
        group: wrapWithAttrCheck(function () {
          return this.put(new G())
        })
      }
    });

    register(G, 'G');

    class A extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('a', node), attrs);
      }

      // Link target attribute
      target (target) {
        return this.attr('target', target)
      }

      // Link url
      to (url) {
        return this.attr('href', url, xlink)
      }

    }

    extend(A, containerGeometry);

    registerMethods({
      Container: {
        // Create a hyperlink element
        link: wrapWithAttrCheck(function (url) {
          return this.put(new A()).to(url)
        })
      },
      Element: {
        unlink () {
          const link = this.linker();

          if (!link) return this

          const parent = link.parent();

          if (!parent) {
            return this.remove()
          }

          const index = parent.index(link);
          parent.add(this, index);

          link.remove();
          return this
        },
        linkTo (url) {
          // reuse old link if possible
          let link = this.linker();

          if (!link) {
            link = new A();
            this.wrap(link);
          }

          if (typeof url === 'function') {
            url.call(link, link);
          } else {
            link.to(url);
          }

          return this
        },
        linker () {
          const link = this.parent();
          if (link && link.node.nodeName.toLowerCase() === 'a') {
            return link
          }

          return null
        }
      }
    });

    register(A, 'A');

    class Mask extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('mask', node), attrs);
      }

      // Unmask all masked elements and remove itself
      remove () {
        // unmask all targets
        this.targets().forEach(function (el) {
          el.unmask();
        });

        // remove mask from parent
        return super.remove()
      }

      targets () {
        return baseFind('svg [mask*="' + this.id() + '"]')
      }
    }

    registerMethods({
      Container: {
        mask: wrapWithAttrCheck(function () {
          return this.defs().put(new Mask())
        })
      },
      Element: {
        // Distribute mask to svg element
        masker () {
          return this.reference('mask')
        },

        maskWith (element) {
          // use given mask or create a new one
          const masker = element instanceof Mask
            ? element
            : this.parent().mask().add(element);

          // apply mask
          return this.attr('mask', 'url("#' + masker.id() + '")')
        },

        // Unmask element
        unmask () {
          return this.attr('mask', null)
        }
      }
    });

    register(Mask, 'Mask');

    class Stop extends Element {
      constructor (node, attrs = node) {
        super(nodeOrNew('stop', node), attrs);
      }

      // add color stops
      update (o) {
        if (typeof o === 'number' || o instanceof SVGNumber) {
          o = {
            offset: arguments[0],
            color: arguments[1],
            opacity: arguments[2]
          };
        }

        // set attributes
        if (o.opacity != null) this.attr('stop-opacity', o.opacity);
        if (o.color != null) this.attr('stop-color', o.color);
        if (o.offset != null) this.attr('offset', new SVGNumber(o.offset));

        return this
      }
    }

    registerMethods({
      Gradient: {
        // Add a color stop
        stop: function (offset, color, opacity) {
          return this.put(new Stop()).update(offset, color, opacity)
        }
      }
    });

    register(Stop, 'Stop');

    function cssRule (selector, rule) {
      if (!selector) return ''
      if (!rule) return selector

      let ret = selector + '{';

      for (const i in rule) {
        ret += unCamelCase(i) + ':' + rule[i] + ';';
      }

      ret += '}';

      return ret
    }

    class Style extends Element {
      constructor (node, attrs = node) {
        super(nodeOrNew('style', node), attrs);
      }

      addText (w = '') {
        this.node.textContent += w;
        return this
      }

      font (name, src, params = {}) {
        return this.rule('@font-face', {
          fontFamily: name,
          src: src,
          ...params
        })
      }

      rule (selector, obj) {
        return this.addText(cssRule(selector, obj))
      }
    }

    registerMethods('Dom', {
      style (selector, obj) {
        return this.put(new Style()).rule(selector, obj)
      },
      fontface  (name, src, params) {
        return this.put(new Style()).font(name, src, params)
      }
    });

    register(Style, 'Style');

    class TextPath extends Text {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('textPath', node), attrs);
      }

      // return the array of the path track element
      array () {
        const track = this.track();

        return track ? track.array() : null
      }

      // Plot path if any
      plot (d) {
        const track = this.track();
        let pathArray = null;

        if (track) {
          pathArray = track.plot(d);
        }

        return (d == null) ? pathArray : this
      }

      // Get the path element
      track () {
        return this.reference('href')
      }
    }

    registerMethods({
      Container: {
        textPath: wrapWithAttrCheck(function (text, path) {
          // Convert text to instance if needed
          if (!(text instanceof Text)) {
            text = this.text(text);
          }

          return text.path(path)
        })
      },
      Text: {
        // Create path for text to run on
        path: wrapWithAttrCheck(function (track, importNodes = true) {
          const textPath = new TextPath();

          // if track is a path, reuse it
          if (!(track instanceof Path)) {
            // create path element
            track = this.defs().path(track);
          }

          // link textPath to path and add content
          textPath.attr('href', '#' + track, xlink);

          // Transplant all nodes from text to textPath
          let node;
          if (importNodes) {
            while ((node = this.node.firstChild)) {
              textPath.node.appendChild(node);
            }
          }

          // add textPath element as child node and return textPath
          return this.put(textPath)
        }),

        // Get the textPath children
        textPath () {
          return this.findOne('textPath')
        }
      },
      Path: {
        // creates a textPath from this path
        text: wrapWithAttrCheck(function (text) {
          // Convert text to instance if needed
          if (!(text instanceof Text)) {
            text = new Text().addTo(this.parent()).text(text);
          }

          // Create textPath from text and path and return
          return text.path(this)
        }),

        targets () {
          return baseFind('svg textPath').filter((node) => {
            return (node.attr('href') || '').includes(this.id())
          })

          // Does not work in IE11. Use when IE support is dropped
          // return baseFind('svg textPath[*|href*="' + this.id() + '"]')
        }
      }
    });

    TextPath.prototype.MorphArray = PathArray;
    register(TextPath, 'TextPath');

    class Use extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('use', node), attrs);
      }

      // Use element as a reference
      use (element, file) {
        // Set lined element
        return this.attr('href', (file || '') + '#' + element, xlink)
      }
    }

    registerMethods({
      Container: {
        // Create a use element
        use: wrapWithAttrCheck(function (element, file) {
          return this.put(new Use()).use(element, file)
        })
      }
    });

    register(Use, 'Use');

    /* Optional Modules */
    const SVG = makeInstance;

    extend([
      Svg,
      Symbol,
      Image,
      Pattern,
      Marker
    ], getMethodsFor('viewbox'));

    extend([
      Line,
      Polyline,
      Polygon,
      Path
    ], getMethodsFor('marker'));

    extend(Text, getMethodsFor('Text'));
    extend(Path, getMethodsFor('Path'));

    extend(Defs, getMethodsFor('Defs'));

    extend([
      Text,
      Tspan
    ], getMethodsFor('Tspan'));

    extend([
      Rect,
      Ellipse,
      Gradient,
      Runner
    ], getMethodsFor('radius'));

    extend(EventTarget, getMethodsFor('EventTarget'));
    extend(Dom, getMethodsFor('Dom'));
    extend(Element, getMethodsFor('Element'));
    extend(Shape, getMethodsFor('Shape'));
    extend([ Container, Fragment ], getMethodsFor('Container'));
    extend(Gradient, getMethodsFor('Gradient'));

    extend(Runner, getMethodsFor('Runner'));

    List.extend(getMethodNames());

    registerMorphableType([
      SVGNumber,
      Color,
      Box,
      Matrix,
      SVGArray,
      PointArray,
      PathArray,
      Point
    ]);

    makeMorphable();

    /*
     * Vex Chords v2
     * Mohit Muthanna Cheppudira -- http://0xfe.blogspot.com
     */

    // ChordBox implements the rendering logic for the chord
    // diagrams.
    class ChordBox {
      // sel can be a selector or an element.
      constructor(sel, params) {
        this.sel = sel;
        this.params = {
          ...{
            numStrings: 6,
            numFrets: 5,
            x: 0,
            y: 0,
            width: 100,
            height: 120,
            strokeWidth: 1,
            showTuning: true,
            defaultColor: '#666',
            bgColor: '#fff',
            labelColor: '#fff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
            fontSize: undefined,
            fontStyle: 'light',
            fontWeight: '100',
            labelWeight: '100',
          },
          ...params,
        };

        // Setup defaults if not specifically overridden
        ['bridgeColor', 'stringColor', 'fretColor', 'strokeColor', 'textColor'].forEach((param) => {
          this.params[param] = this.params[param] || this.params.defaultColor;
        });

        ['stringWidth', 'fretWidth'].forEach((param) => {
          this.params[param] = this.params[param] || this.params.strokeWidth;
        });

        // Create canvas and add it to the DOM
        this.canvas = SVG()
          .addTo(sel)
          .size(this.params.width, this.params.height);

        // Size and shift board
        this.width = this.params.width * 0.75;
        this.height = this.params.height * 0.75;
        this.x = this.params.x + this.params.width * 0.15;
        this.y = this.params.y + this.params.height * 0.15;

        this.numStrings = this.params.numStrings;
        this.numFrets = this.params.numFrets;

        this.spacing = this.width / this.numStrings;
        this.fretSpacing = this.height / (this.numFrets + 2);

        // Add room on sides for finger positions on 1. and 6. string
        this.x += this.spacing / 2;
        this.y += this.fretSpacing;

        this.metrics = {
          circleRadius: this.width / 20,
          barreRadius: this.width / 25,
          fontSize: this.params.fontSize || Math.ceil(this.width / 8),
          barShiftX: this.width / 28,
          bridgeStrokeWidth: Math.ceil(this.height / 36),
        };

        // Content
        this.position = 0;
        this.positionText = 0;
        this.chord = [];
        this.bars = [];
        this.tuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      }

      setNumFrets(numFrets) {
        this.numFrets = numFrets;
        this.fretSpacing = this.height / (this.numFrets + 1);
        return this;
      }

      setPositionText(position) {
        this.positionText = position;
        return this;
      }

      drawText(x, y, msg, attrs) {
        const textAttrs = {
          ...{
            family: this.params.fontFamily,
            size: this.metrics.fontSize,
            style: this.params.fontStyle,
            weight: this.params.fontWeight,
          },
          ...attrs,
        };

        const text = this.canvas
          .text(`${msg}`)
          .stroke(this.params.textColor)
          .fill(this.params.textColor)
          .font(textAttrs);

        return text.move(x - text.length() / 2, y);
      }

      drawLine(x, y, newX, newY) {
        return this.canvas.line(0, 0, newX - x, newY - y).move(x, y);
      }

      draw({
        chord, position, barres, positionText, tuning,
      }) {
        this.chord = chord;
        this.position = position || 0;
        this.positionText = positionText || 0;
        this.barres = barres || [];
        this.tuning = tuning || ['E', 'A', 'D', 'G', 'B', 'E'];
        if (this.tuning.length === 0) {
          this.fretSpacing = this.height / (this.numFrets + 1);
        }

        const { spacing } = this;
        const { fretSpacing } = this;

        // Draw guitar bridge
        if (this.position <= 1) {
          const fromX = this.x;
          const fromY = this.y - this.metrics.bridgeStrokeWidth;
          this.canvas
            .rect(this.x + spacing * (this.numStrings - 1) - fromX, this.y - fromY)
            .move(fromX, fromY)
            .stroke({ width: 0 })
            .fill(this.params.bridgeColor);
        } else {
          // Draw position number
          this.drawText(this.x - this.spacing / 2 - this.spacing * 0.1, this.y + this.fretSpacing * this.positionText, this.position);
        }

        // Draw strings
        for (let i = 0; i < this.numStrings; i += 1) {
          this.drawLine(this.x + spacing * i, this.y, this.x + spacing * i, this.y + fretSpacing * this.numFrets).stroke({
            width: this.params.stringWidth,
            color: this.params.stringColor,
          });
        }

        // Draw frets
        for (let i = 0; i < this.numFrets + 1; i += 1) {
          this.drawLine(this.x, this.y + fretSpacing * i, this.x + spacing * (this.numStrings - 1), this.y + fretSpacing * i).stroke({
            width: this.params.fretWidth,
            color: this.params.fretColor,
          });
        }

        // Draw tuning keys
        if (this.params.showTuning && this.tuning.length !== 0) {
          for (let i = 0; i < Math.min(this.numStrings, this.tuning.length); i += 1) {
            this.drawText(this.x + this.spacing * i, this.y + this.numFrets * this.fretSpacing + this.fretSpacing / 12, this.tuning[i]);
          }
        }

        // Draw chord
        for (let i = 0; i < this.chord.length; i += 1) {
          // Light up string, fret, and optional label.
          this.lightUp({
            string: this.chord[i][0],
            fret: this.chord[i][1],
            label: this.chord.length > 2 ? this.chord[i][2] : undefined,
          });
        }

        // Draw barres
        for (let i = 0; i < this.barres.length; i += 1) {
          this.lightBar(this.barres[i].fromString, this.barres[i].toString, this.barres[i].fret);
        }
      }

      lightUp({ string, fret, label }) {
        const stringNum = this.numStrings - string;
        const shiftPosition = this.position === 1 && this.positionText === 1 ? this.positionText : 0;

        const mute = fret === 'x';
        const fretNum = fret === 'x' ? 0 : fret - shiftPosition;

        const x = this.x + this.spacing * stringNum;
        let y = this.y + this.fretSpacing * fretNum;

        if (fretNum === 0) {
          y -= this.metrics.bridgeStrokeWidth;
        }

        if (!mute) {
          this.canvas
            .circle()
            .move(x, y - this.fretSpacing / 2)
            .radius(this.metrics.circleRadius)
            .stroke({ color: this.params.strokeColor, width: this.params.strokeWidth })
            .fill(fretNum > 0 ? this.params.strokeColor : this.params.bgColor);
        } else {
          this.drawText(x, y - this.fretSpacing, 'X');
        }

        if (label) {
          const fontSize = this.metrics.fontSize * 0.55;
          const textYShift = fontSize * 0.66;
          this.drawText(x, y - this.fretSpacing / 2 - textYShift, label, {
            weight: this.params.labelWeight,
            size: fontSize,
          })
            .stroke({
              width: 0.7,
              color: fretNum !== 0 ? this.params.labelColor : this.params.strokeColor,
            })
            .fill(fretNum !== 0 ? this.params.labelColor : this.params.strokeColor);
        }

        return this;
      }

      lightBar(stringFrom, stringTo, theFretNum) {
        let fretNum = theFretNum;
        if (this.position === 1 && this.positionText === 1) {
          fretNum -= this.positionText;
        }

        const stringFromNum = this.numStrings - stringFrom;
        const stringToNum = this.numStrings - stringTo;

        const x = this.x + this.spacing * stringFromNum - this.metrics.barShiftX;
        const xTo = this.x + this.spacing * stringToNum + this.metrics.barShiftX;

        const y = this.y + this.fretSpacing * (fretNum - 1) + this.fretSpacing / 4;
        const yTo = this.y + this.fretSpacing * (fretNum - 1) + (this.fretSpacing / 4) * 3;

        this.canvas
          .rect(xTo - x, yTo - y)
          .move(x, y)
          .radius(this.metrics.barreRadius)
          .fill(this.params.strokeColor);

        return this;
      }
    }

    /* src/GuitarChords.svelte generated by Svelte v3.47.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    // (134:8) {#each NOTES as base_note}
    function create_each_block_1(ctx) {
    	let div;
    	let t0_value = /*getBaseNoteName*/ ctx[7](/*base_note*/ ctx[22]) + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*base_note*/ ctx[22]);
    	}

    	return {
    		c() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr(div, "class", "note-button");
    			toggle_class(div, "button-selected", /*base_note*/ ctx[22] === /*note*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);

    			if (!mounted) {
    				dispose = listen(div, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*NOTES, note*/ 17) {
    				toggle_class(div, "button-selected", /*base_note*/ ctx[22] === /*note*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (143:8) {#if getChordName(note_chords[0]) !== ''}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*note_chords*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*getChordName, note_chords, chord, setChord, undefined*/ 74) {
    				each_value = /*note_chords*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (149:20) {#if getChordName(note_chord).split(' ')[1] !== undefined}
    function create_if_block_1(ctx) {
    	let br;
    	let t0;
    	let t1_value = getChordName(/*note_chord*/ ctx[19]).split(' ')[1] + "";
    	let t1;

    	return {
    		c() {
    			br = element("br");
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m(target, anchor) {
    			insert(target, br, anchor);
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*note_chords*/ 8 && t1_value !== (t1_value = getChordName(/*note_chord*/ ctx[19]).split(' ')[1] + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(br);
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (144:12) {#each note_chords as note_chord}
    function create_each_block(ctx) {
    	let div;
    	let t0_value = getChordName(/*note_chord*/ ctx[19]).split(' ')[0] + "";
    	let t0;
    	let t1;
    	let show_if = getChordName(/*note_chord*/ ctx[19]).split(' ')[1] !== undefined;
    	let t2;
    	let mounted;
    	let dispose;
    	let if_block = show_if && create_if_block_1(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[9](/*note_chord*/ ctx[19]);
    	}

    	return {
    		c() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			attr(div, "class", "chord-button");
    			toggle_class(div, "button-selected", getChordName(/*note_chord*/ ctx[19]) === getChordName(/*chord*/ ctx[1]));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			if (if_block) if_block.m(div, null);
    			append(div, t2);

    			if (!mounted) {
    				dispose = listen(div, "click", click_handler_1);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*note_chords*/ 8 && t0_value !== (t0_value = getChordName(/*note_chord*/ ctx[19]).split(' ')[0] + "")) set_data(t0, t0_value);
    			if (dirty & /*note_chords*/ 8) show_if = getChordName(/*note_chord*/ ctx[19]).split(' ')[1] !== undefined;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*getChordName, note_chords, chord*/ 10) {
    				toggle_class(div, "button-selected", getChordName(/*note_chord*/ ctx[19]) === getChordName(/*chord*/ ctx[1]));
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let show_if = getChordName(/*note_chords*/ ctx[3][0]) !== '';
    	let t1;
    	let div3;
    	let div2;
    	let t2;
    	let p;
    	let t3_value = /*chord*/ ctx[1].tones + "";
    	let t3;
    	let each_value_1 = /*NOTES*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block = show_if && create_if_block(ctx);

    	return {
    		c() {
    			div4 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div3 = element("div");
    			div2 = element("div");
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			this.c = noop;
    			attr(div0, "class", "notes-row");
    			attr(div1, "class", "chords-row");
    			attr(div3, "class", "chord");
    			attr(p, "class", "tones");
    			attr(div4, "class", "notes-menu");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append(div4, t0);
    			append(div4, div1);
    			if (if_block) if_block.m(div1, null);
    			append(div4, t1);
    			append(div4, div3);
    			append(div3, div2);
    			/*div2_binding*/ ctx[10](div2);
    			append(div4, t2);
    			append(div4, p);
    			append(p, t3);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*NOTES, note, setBaseNote, getBaseNoteName*/ 177) {
    				each_value_1 = /*NOTES*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty & /*note_chords*/ 8) show_if = getChordName(/*note_chords*/ ctx[3][0]) !== '';

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*chord*/ 2 && t3_value !== (t3_value = /*chord*/ ctx[1].tones + "")) set_data(t3, t3_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			/*div2_binding*/ ctx[10](null);
    		}
    	};
    }

    function adjustFrets(frets, position) {
    	return frets.map(fret => {
    		const fretInt = Number(fret);
    		let first_fred = 0;

    		if (position > 0) {
    			first_fred = 1;
    		}

    		return fret !== 'X'
    		? fretInt - position + first_fred
    		: fret.toLowerCase();
    	});
    }

    function getPositionFromFrets(frets) {
    	const filteredFrets = frets.map(string => {
    		if (string !== 'X') {
    			return string;
    		}
    	}).filter(Boolean);

    	return Math.min(...filteredFrets) === Infinity
    	? 0
    	: Math.min(...filteredFrets);
    }

    function getChordName(chord) {
    	let enharmonicChordName = chord.enharmonicChordName.split(',').join('');
    	let chordName = chord.chordName.split(',').join('');

    	return enharmonicChordName === chordName
    	? chordName
    	: enharmonicChordName + ' ' + chordName;
    }

    function setFingering(chord) {
    	return chord.fingering.split(' ');
    }

    function setStrings(chord) {
    	return chord.strings.split(' ');
    }

    function instance($$self, $$props, $$invalidate) {
    	let tuning = ["E", "A", "D", "G", "B", "E"];
    	let chordElement;
    	afterUpdate(drawChord);

    	function drawChord() {
    		$$invalidate(2, chordElement.innerHTML = '', chordElement);
    		let calculatedPosition =  getPositionFromFrets(strings);
    		const adjustedFrets = adjustFrets(strings, calculatedPosition);

    		let chordbox = new ChordBox(chordElement,
    		{
    				defaultColor: '#666',
    				bgColor: '#666',
    				strokeColor: '#DDD',
    				stringColor: '#AAA',
    				fretColor: '#999',
    				labelColor: '#666',
    				fontFamily: 'Verdana, Arial, Helvetica, sans-serif',
    				fontWeight: 'lighter',
    				labelWeight: 'lighter'
    			});

    		let barres = JSON.parse(JSON.stringify(fingering));

    		chordbox.draw({
    			barres: getBarres(barres.reverse(), adjustedFrets),
    			chord: getChord(fingering, adjustedFrets),
    			position: calculatedPosition,
    			tuning
    		});

    		const svgElement = chordElement.querySelector(`svg`);
    		svgElement.setAttribute("viewBox", "0 10 100 100");
    		svgElement.setAttribute("width", "100%");
    		svgElement.setAttribute("height", "100%");
    	}

    	function getBarres(fingering, frets) {
    		let fret = JSON.parse(JSON.stringify(frets));
    		fret.reverse();
    		let barres = [];

    		fingering.forEach((finger, index) => {
    			let sibling = getSibling(finger, index, fingering);

    			if (sibling !== -1) {
    				barres.push({
    					fromString: sibling,
    					toString: index + 1,
    					fret: fret[index]
    				});
    			}
    		});

    		return barres;
    	}

    	function getSibling(finger, index, fingering) {
    		return isNaN(finger)
    		? -1
    		: fingering.lastIndexOf(finger) === index
    			? -1
    			: fingering.lastIndexOf(finger) + 1;
    	}

    	function getChord(fingering, frets) {
    		return frets.map((fret, i) => {
    			const fingerFormatted = isNaN(fingering[i]) || fret === 0 ? ' ' : fingering[i];
    			return [frets.length - i, fret, fingerFormatted];
    		});
    	}

    	let { note = '' } = $$props;
    	let note_chords;
    	let chord = empty_chord[0];

    	function initChords(note) {
    		let chords = getChords(note);
    		$$invalidate(1, chord = chords[0]);
    		return chords;
    	}

    	let NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    	let fingering;
    	let strings;

    	function setBaseNote(base_note) {
    		$$invalidate(0, note = base_note);
    	}

    	function setChord(selected_chord) {
    		$$invalidate(1, chord = selected_chord);
    	}

    	function getBaseNoteName(base_note) {
    		let chords = getChords(base_note);
    		return getChordName(chords[0]);
    	}

    	const click_handler = base_note => {
    		setBaseNote(base_note);
    	};

    	const click_handler_1 = note_chord => {
    		setChord(note_chord);
    	};

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			chordElement = $$value;
    			$$invalidate(2, chordElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('note' in $$props) $$invalidate(0, note = $$props.note);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*note*/ 1) {
    			 $$invalidate(3, note_chords = initChords(note));
    		}

    		if ($$self.$$.dirty & /*chord*/ 2) {
    			 fingering = setFingering(chord);
    		}

    		if ($$self.$$.dirty & /*chord*/ 2) {
    			 strings = setStrings(chord);
    		}
    	};

    	return [
    		note,
    		chord,
    		chordElement,
    		note_chords,
    		NOTES,
    		setBaseNote,
    		setChord,
    		getBaseNoteName,
    		click_handler,
    		click_handler_1,
    		div2_binding
    	];
    }

    class GuitarChords extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.notes-menu{display:flex;align-items:center;flex-direction:column;width:100%;height:100%}.tones{font-family:Verdana, Arial, Helvetica, sans-serif}.notes-row{display:flex;flex-wrap:wrap;border:none;width:fit-content;gap:0.2rem;margin-bottom:1rem}.chords-row{display:grid;grid-template-columns:auto auto auto auto auto;border:none;width:fit-content;height:81px;gap:0.2rem}.chord{width:200px;display:flex;align-items:center}.note-button{border:1px solid #999;border-radius:5px;color:#999;width:fit-content;font-family:Verdana, Arial, Helvetica, sans-serif;font-weight:normal;font-size:small;cursor:pointer;padding:0.2rem 0.5rem;display:flex;flex-direction:column;justify-content:center;max-width:min-content}.chord-button{border:1px solid #999;border-radius:5px;color:#999;text-align:center;font-family:Verdana, Arial, Helvetica, sans-serif;font-weight:normal;font-size:small;cursor:pointer;padding:0.2rem 0.3rem;width:available;margin-bottom:auto;margin-top:auto}.button-selected{border:1px solid #1A1A1A;color:#1A1A1A;background-color:#999}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{ note: 0 },
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["note"];
    	}

    	get note() {
    		return this.$$.ctx[0];
    	}

    	set note(note) {
    		this.$$set({ note });
    		flush();
    	}
    }

    customElements.define("guitar-chords", GuitarChords);

    return GuitarChords;

}());
