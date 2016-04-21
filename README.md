# browserify-cortex

bundle cortex project by browserify

# install

```
> npm i -g browserify-cortex
```

# usage

```
> cd some/cortex/project
> bcortex
```

## set bundle project

if no version provided, the latest release version will be used

```
> bcortex -p hornet-hover
> bcortex -p hornet-hover@1.0.0
> bcortex --project hornet-hover
```

## specify output bundle name

```
> bcortex -o Hornet
> bcortex --ouput Hornet
```

# known issues

- only bundles released project
