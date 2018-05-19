# Smart Device Shadow (SDS)
Device shadows are a persistent data structure used to represent the state of an IoT device, see [AWS IoT](https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-shadows.html). 
Smart Device Shadows innovate on Device shadows by storing the logic for state change as part of the device shadow.
Smart Device Shadows or SDS exist as objects inside a rules engine, the rules engine facilitates SDS life cycles, event messaging and manages SDS state by enforcing associated Rules.

SDS are well suited not only for IoT but as well for [Spimes](https://en.wikipedia.org/wiki/Spime). SDS excels as a [Microservices](https://en.wikipedia.org/wiki/Microservices) architecture, with each microservice represented as SDS.

## Getting Started / Installing / Configuration

See [packages/pico-engine](https://github.com/Picolab/pico-engine/tree/master/packages/pico-engine#readme)

## Contributing

The `SDS` is made up of several smaller modules. Each with their own documentation and test suite.

However they live in this repository in the `packages/` directory (mono-repo style using [lerna](https://github.com/lerna/lerna))
 * **pico-engine** - this is the npm package people install and use
 * **pico-engine-core** - executes compiled KRL and manages event life-cycle
 * **krl-stdlib** - standard library for KRL
 * **krl-compiler** - compiles AST into a JavaScript module
 * **krl-parser** - parses KRL to produce an abstract syntax tree (String -> AST)
 * **krl-generator** - generates KRL from an AST (AST -> String)
 * **krl-editor** - in browser editor for KRL

To run the Smart-Device-Shadows in development mode do the following:

```sh
$ git clone https://github.com/burdettadam/Smart-Device-Shadows.git
$ cd Smart-Device-Shadows
$ npm run setup
$ npm start
```

That will start the server and run the test. `npm start` is simply an alias for `cd packages/pico-engine && npm start`

**NOTE about dependencies:** generally don't use `npm i`, rather use `npm run setup` from the root. [lerna](https://github.com/lerna/lerna) will link up the packages so when you make changes in one package, it will be used in others.


### Working in sub-package

Each sub-package has it's own tests. And the `npm start` command is wired to watch for file changes and re-run tests when you make changes.  For example, to make changes to the parser:

```sh
$ cd packages/krl-parser/
$ npm start
```

NOTE: When running via `npm start` the `PICO_ENGINE_HOME` will default to your current directory i.e. your clone of this repository.

### Making changes

Branch it, make changes, create a pull request.  We will review it before merging it into master.

View [docs/git-cheatsheet.md](https://github.com/Picolab/pico-engine/blob/master/docs/git-cheatsheet.md) for more.

## License
MIT, GPL
