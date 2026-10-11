// ----- Get time-based greeting -----
function getTimeBasedGreeting() {
    var hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

// ----- Extract and format a single section -----
function extractSection(key, moduleMeta, sectionData) {
    var supportedTypes = ['song', 'track', 'album', 'playlist', 'artist'];

    if (!sectionData || !sectionData.length) {
        log.debug('[extractSection] Skipping empty section: ' + key);
        return null;
    }

    // Check if at least one item has a supported type
    var hasSupportedType = false;
    for (var i = 0; i < sectionData.length; i++) {
        var itemType = sectionData[i].type || 'track';
        if (supportedTypes.indexOf(itemType) !== -1) {
            hasSupportedType = true;
            break;
        }
    }

    if (!hasSupportedType) {
        log.debug('[extractSection] Skipping section with unsupported items: ' + key);
        return null;
    }

    var formattedItems = [];
    for (var j = 0; j < sectionData.length; j++) {
        var rawItem = sectionData[j];
        var itemType = rawItem.type || 'track';
        var formatted = formatHomeFeedItem(rawItem, itemType);
        if (formatted) {
            formattedItems.push(formatted);
        }
    }

    if (!formattedItems.length) {
        log.debug('[extractSection] No valid items to display for section: ' + key);
        return null;
    }

    return {
        title: decodeEntities(moduleMeta.title || key),
        items: formattedItems
    };
}

function getHomeFeed() {
    log.debug('[getHomeFeed] Starting home feed generation');

    var data = getLaunchData();
    if (!data) {
        log.debug('[getHomeFeed] No launch data available');
        return { success: false, error: 'No home feed data available' };
    }

    var modules = data.modules || {};
    var sections = [];

    for (var key in modules) {
        if (!modules.hasOwnProperty(key)) continue;

        var moduleMeta = modules[key];
        var sectionData = data[key];

        var section = extractSection(key, moduleMeta, sectionData);
        if (section) {
            sections.push(section);
            log.debug('[getHomeFeed] Added section: ' + section.title + ' with ' + section.items.length + ' items');
        }
    }

    var greeting = getTimeBasedGreeting();

    log.debug('[getHomeFeed] Returning ' + sections.length + ' sections');
    return {
        success: true,
        greeting: greeting,
        sections: sections
    };
}
