/**
 * @since 2016-04-13 15:25
 * @author vivaxy
 */

const NOT_FOUND_INDEX = -1;

module.exports = (name) => {
    return name.replace(/(-|^)\w/g, (found) => {
        return found.slice(NOT_FOUND_INDEX).toUpperCase();
    });
};
