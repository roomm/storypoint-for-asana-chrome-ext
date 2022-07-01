'use strict';

// Constants
const SP_BADGES = ['0.25','0.5','1','2','4','8']
const badgeStyle = {
    background: '#3498db',
    borderRadius: '12px',
    minWidth: '12px',
    height: '12px',
    padding: '5px',
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    marginLeft: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    lineHeight: '11px'
}
const countStyle = {
    'padding': '0 5px',
    'color': '#000',
    'opacity': '0.7',
    'text-align': 'center',
    'font-weight': '600',
    'margin-left': '4px',
    'font-size': '18px'
}

const clearBadgeColor = '#95a5a6';
const syncSubtaskBadgeColor = '#1abc9c';
const completedBadgeColor = '#f39c12';


// Board
// Display of badge (when displaying card)
setInterval(() => {
    // Element to operate
    const bodyContainerPromise = getElementUntilRendered(document,'.SingleTaskPaneFields', 100)
    const titleTextAreaPromise = getElementUntilRendered(document,'.simpleTextarea--dynamic', 100)

    // When all the elements to be operated are acquired (when the card is displayed)
    Promise.all([bodyContainerPromise, titleTextAreaPromise])
        .then(([bodyContainer, titleTextArea]) => {
            // Is the badge already displayed?
            const hasBadgeContainer = document.getElementsByClassName('badge-container').length !== 0
            if(hasBadgeContainer){
                return ;
            }

            // Badge generation
            const badgeElements = SP_BADGES.map(e => {
                const badgeElement = document.createElement('span')
                badgeElement.textContent = e
                Object.keys(badgeStyle).forEach(key => {
                    badgeElement.style[key] = badgeStyle[key]
                })
                badgeElement.addEventListener('click', function(e){
                    titleTextArea.focus()
                    titleTextArea.value = '[' + e.target.textContent + '] ' + titleTextArea.value.replace(/^\[.+\] /, '')
                    var evt = document.createEvent('KeyboardEvent');
                    evt.initEvent('input', true, false);
                    // adding this created a magic and passes it as if keypressed
                    titleTextArea.dispatchEvent(evt);
                    titleTextArea.blur()
                }, false)
                return badgeElement
            })
            // Generation of clear badge
            const clearBadge = (()=>{
                const badgeElement = document.createElement('span')
                badgeElement.textContent = 'clear'
                Object.keys(badgeStyle).forEach(key => {
                    badgeElement.style[key] = badgeStyle[key]
                })
                badgeElement.style.background = clearBadgeColor

                badgeElement.addEventListener('click', function(e){
                    titleTextArea.focus()
                    titleTextArea.value = titleTextArea.value.replace(/^\[.+\] /, '')
                    var evt = document.createEvent('KeyboardEvent');
                    evt.initEvent('input', true, false);
                    // adding this created a magic and passes it as if keypressed
                    titleTextArea.dispatchEvent(evt);
                    titleTextArea.blur()
                }, false)
                return badgeElement
            })()
            badgeElements.unshift(clearBadge);
            // Generate subtask update badge (press the button to calculate the SP set for the subtask and set it to the SP for this task)
            const syncSubtaskBadge = (()=>{
                const badgeElement = document.createElement('span')
                badgeElement.textContent = 'sync subtasks'
                Object.keys(badgeStyle).forEach(key => {
                    badgeElement.style[key] = badgeStyle[key]
                })
                badgeElement.style.background = syncSubtaskBadgeColor

                badgeElement.addEventListener('click', function(e){
                    // Aggregate SP of subtasks
                    const subtasks = document.querySelectorAll('.TaskList > .DropTargetRow')
                    let subtasksNotCompletedStoryPoint = 0, subtasksCompletedStoryPoint = 0;
                    Array.prototype.forEach.call(subtasks, e => {
                        const isCompleted = !!e.querySelector('.TaskRowCompletionStatus-checkbox--complete')
                        const subtaskTitleElement = e.querySelector('.AutogrowTextarea-shadow')
                        if(subtaskTitleElement){
                            const sp_matched = subtaskTitleElement.textContent.match(/^\[(\d+(?:\.\d+)?)\]/)
                            if(sp_matched){
                                if(isCompleted) {
                                    subtasksCompletedStoryPoint += Number(sp_matched[1])
                                }
                                subtasksNotCompletedStoryPoint += Number(sp_matched[1])
                            }
                        }
                    })
                    const titlePrefix = (() => {
                        if(subtasksNotCompletedStoryPoint){
                            return '[' + subtasksNotCompletedStoryPoint + '] '
                        }
                        return ''
                    })()
                    const titlePostfix = (() => {
                        if(subtasksCompletedStoryPoint){
                            return ' [' + subtasksCompletedStoryPoint + ']'
                        }
                        return ''
                    })()


                    // Edit
                    titleTextArea.focus()
                    titleTextArea.value = titlePrefix + titleTextArea.value + titlePostfix
                    var evt = document.createEvent('KeyboardEvent');
                    evt.initEvent('input', true, false);
                    // adding this created a magic and passes it as if keypressed
                    titleTextArea.dispatchEvent(evt);
                    titleTextArea.blur()
                }, false)
                return badgeElement
            })()
            badgeElements.push(syncSubtaskBadge);

            // Generate badge container
            let badgeContainer = document.createElement('div')
            badgeContainer.style.display = 'flex'
            badgeContainer.style.margin = '2px 10px'
            badgeContainer.className = 'badge-container LabeledRowStructure-right'

            // Inserting a badge into the badge container
            badgeElements.forEach(e => {
                badgeContainer.appendChild(e)
            })

            // Place badge container in DOM
            // fixed 20.01.19  2 column style
            let fieldContainer = document.createElement('div')
            fieldContainer.className = 'LabeledRowStructure'
            const rightColumn = (() => {
              let labelContainer = document.createElement('div')
              labelContainer.style.width = '100px'
              labelContainer.className = 'LabeledRowStructure-left'
              let label = document.createElement('label')
              label.className = 'LabeledRowStructure-label'
              label.textContent = 'Task Effort'
              labelContainer.appendChild(label)
              return labelContainer
            })()
            fieldContainer.appendChild(rightColumn)
            fieldContainer.appendChild(badgeContainer)

            // Add on description
            const fields = bodyContainer.children
            bodyContainer.insertBefore(fieldContainer, fields[fields.length-1])
        })
}, 1000)

// The total points for each card row on the board are displayed at the top.
setInterval(() => {
    // Element to operate
    const boardColumnsPromise = getElementsUntilRendered(document, '.BoardColumn', 100)

    // When all the elements to be operated are acquired (when the card is displayed)
    boardColumnsPromise
        .then(boardColumns => {
            let totalNotCompletedStoryPoint = 0, totalCompletedStoryPoint = 0;

            // Aggregation by each column
            boardColumns.forEach(boardColumn => {

                // Element to operate
                const boardColumnHeader = boardColumn.querySelector('.BoardColumnHeader')
                const boardCardNames = boardColumn.querySelectorAll('.BoardCard-taskName')

                // SP calculation
                let columnTotalNotCompletedStoryPoint = 0, columnTotalCompletedStoryPoint = 0;
                Array.prototype.forEach.call(boardCardNames, (e) => {
                    const isCompleted = e.parentElement.parentElement.getElementsByClassName('TaskRowCompletionStatus-taskCompletionIcon--complete').length !== 0;
                    const sp_matched = e.textContent.match(/^\[(\d+(?:\.\d+)?)\]/) // SP Example: (10) Task => 10
                    const sp_subtask_completed_matched = e.textContent.match(/\[(\d+(?:\.\d+)?)\]$/) // Partially completed task SP Example: (10) Task [5] => 5/5
                    if(sp_matched){
                        if(isCompleted) {
                            columnTotalCompletedStoryPoint += Number(sp_matched[1])
                        } else {
                            if(sp_subtask_completed_matched) {
                                // There is a subtask completion SP
                                columnTotalNotCompletedStoryPoint += Number(sp_matched[1]) - Number(sp_subtask_completed_matched[1])
                                columnTotalCompletedStoryPoint += Number(sp_subtask_completed_matched[1])
                            } else {
                                columnTotalNotCompletedStoryPoint += Number(sp_matched[1])
                            }
                        }
                    }
                })
                totalNotCompletedStoryPoint += columnTotalNotCompletedStoryPoint
                totalCompletedStoryPoint += columnTotalCompletedStoryPoint

                // number
                {
                    const hasTotalCountElement = boardColumn.querySelector('.columntop-count-story-point')
                    if(hasTotalCountElement){
                        hasTotalCountElement.textContent = displayNumber(boardCardNames.length)
                    } else {
                        // Generate a total badge to display at the top
                        let totalStoryPointElement = document.createElement('span')
                        totalStoryPointElement.className = 'columntop-count-story-point'
                        totalStoryPointElement.textContent = displayNumber(boardCardNames.length)
                        Object.keys(countStyle).forEach(key => {
                            totalStoryPointElement.style[key] = countStyle[key]
                        })

                        boardColumnHeader.appendChild(totalStoryPointElement)
                    }
                }
                // Unfinished StoryPoint
                {
                    const hasTotalStoryPointElement = boardColumn.querySelector('.columntop-notcompleted-story-point')
                    if(hasTotalStoryPointElement){
                        hasTotalStoryPointElement.textContent = displayNumber(columnTotalNotCompletedStoryPoint)
                    } else {
                        // Generate a total badge to display at the top
                        let totalStoryPointElement = document.createElement('span')
                        totalStoryPointElement.className = 'columntop-notcompleted-story-point'
                        totalStoryPointElement.textContent = displayNumber(columnTotalNotCompletedStoryPoint)
                        Object.keys(badgeStyle).forEach(key => {
                            totalStoryPointElement.style[key] = badgeStyle[key]
                        })

                        boardColumnHeader.appendChild(totalStoryPointElement)
                    }
                }
                // End StoryPoint (This is displayed only when there is 1 or more points)
                {
                    const hasTotalStoryPointElement = boardColumn.querySelector('.columntop-completed-story-point')
                    if(hasTotalStoryPointElement){
                        // If 0, do not display
                        if(columnTotalCompletedStoryPoint === 0){
                            hasTotalStoryPointElement.parentNode.removeChild(hasTotalStoryPointElement)
                            return
                        }

                        hasTotalStoryPointElement.textContent = displayNumber(columnTotalCompletedStoryPoint)
                    } else {
                        // If 0, do not display
                        if(columnTotalCompletedStoryPoint === 0){
                            return
                        }

                        // Generate a total badge to display at the top
                        let totalStoryPointElement = document.createElement('span')
                        totalStoryPointElement.className = 'columntop-completed-story-point'
                        totalStoryPointElement.textContent = displayNumber(columnTotalCompletedStoryPoint)
                        Object.keys(badgeStyle).forEach(key => {
                            totalStoryPointElement.style[key] = badgeStyle[key]
                        })
                        totalStoryPointElement.style.background = completedBadgeColor

                        boardColumnHeader.appendChild(totalStoryPointElement)
                    }
                }
            })

            // Total on board (displayed on the right side of the project name at the top of the board)
            const boardTitleContainer = document.querySelector('.TopbarPageHeaderStructure-titleRow')
            if(!boardTitleContainer) return ;
            {
                const hasTotalStoryPointElement = document.querySelector('.boardtop-notcompleted-story-point')
                if(hasTotalStoryPointElement) {
                    hasTotalStoryPointElement.textContent = displayNumber(totalNotCompletedStoryPoint)
                } else {
                    // If 0, do not display
                    if(totalNotCompletedStoryPoint === 0) {
                        return
                    }
                    // Show total incomplete SP badge
                    let totalStoryPointElement = document.createElement('span')
                    totalStoryPointElement.className = 'boardtop-notcompleted-story-point'
                    totalStoryPointElement.textContent = displayNumber(totalNotCompletedStoryPoint)
                    Object.keys(badgeStyle).forEach(key => {
                        totalStoryPointElement.style[key] = badgeStyle[key]
                    })
                    boardTitleContainer.appendChild(totalStoryPointElement)
                }
            }
            // Show total completed SP badge
            {
                const hasTotalStoryPointElement = document.querySelector('.boardtop-completed-story-point')
                if(hasTotalStoryPointElement) {
                    // If 0, do not display
                    if(totalCompletedStoryPoint === 0){
                        hasTotalStoryPointElement.parentNode.removeChild(hasTotalStoryPointElement)
                        return
                    }

                    hasTotalStoryPointElement.textContent = displayNumber(totalCompletedStoryPoint)
                } else {
                    // If 0, do not display
                    if(totalCompletedStoryPoint === 0) {
                        return
                    }
                    let totalStoryPointElement = document.createElement('span')
                    totalStoryPointElement.className = 'boardtop-completed-story-point'
                    totalStoryPointElement.textContent = displayNumber(totalCompletedStoryPoint)
                    Object.keys(badgeStyle).forEach(key => {
                        totalStoryPointElement.style[key] = badgeStyle[key]
                    })
                    totalStoryPointElement.style.background = completedBadgeColor
                    boardTitleContainer.appendChild(totalStoryPointElement)
                }
            }

        })

}, 1000)

// List & Mytask
//Show section total on the right side
setInterval(() => {
    // Element to operate
    const listSectionsPromise = getElementsUntilRendered(document, '.DropTargetTaskGroupHeader', 100)

    // When all the elements to be operated are acquired (when the card is displayed)
    listSectionsPromise
        .then(listSections => {
            let totalNotCompletedStoryPoint = 0, totalCompletedStoryPoint = 0;

            // Aggregation by each column
            listSections.forEach(listSection => {

                // Element to operate
                const listSectionHeader = listSection.querySelector('.TaskGroupHeader-headerContainer')
                const listSectionDropTargetRow = listSection.parentElement

                // SP calculation
                let columnTotalNotCompletedStoryPoint = 0, columnTotalCompletedStoryPoint = 0;

                // Procedural loop: Step by step until you reach the next List Section
                let cnt = 0

                // List
                let nextRow = listSectionDropTargetRow.querySelector('.DropTargetRow.ProjectSpreadsheetGridRow-dropTargetRow')
                // MyTask
                if (nextRow === null) {
                    nextRow = listSectionDropTargetRow.querySelector('.MyTasksSpreadsheetGridRow-dropTargetRow')
                }

                while( cnt < 1000 && nextRow && nextRow.querySelector('.SpreadsheetTaskName-input') ) {

                    const titleElement = nextRow.querySelector('.SpreadsheetTaskName-input')
                    const title = titleElement.textContent
                    const isCompleted = nextRow.getElementsByClassName('TaskRowCompletionStatus-taskCompletionIcon--complete').length !== 0;
                    const sp_matched = title.match(/^\[(\d+(?:\.\d+)?)\]/) // SP   Example: (10) Task => 10
                    const sp_subtask_completed_matched = title.match(/\[(\d+(?:\.\d+)?)\]$/) // Partially completed task SP Example: (10) Task [5] => 5/5
                    if(sp_matched){
                        if(isCompleted) {
                            columnTotalCompletedStoryPoint += Number(sp_matched[1])
                        } else {
                            if(sp_subtask_completed_matched) {
                                // There is a subtask completion SP
                                columnTotalNotCompletedStoryPoint += Number(sp_matched[1]) - Number(sp_subtask_completed_matched[1])
                                columnTotalCompletedStoryPoint += Number(sp_subtask_completed_matched[1])
                            } else {
                                columnTotalNotCompletedStoryPoint += Number(sp_matched[1])
                            }
                        }
                    }
                    nextRow = nextRow.nextElementSibling
                    ++cnt
                }
                totalNotCompletedStoryPoint += columnTotalNotCompletedStoryPoint
                totalCompletedStoryPoint += columnTotalCompletedStoryPoint

                // Unfinished StoryPoint
                {
                    const hasTotalStoryPointElement = listSection.querySelector('.columntop-notcompleted-story-point')
                    if(hasTotalStoryPointElement){
                        hasTotalStoryPointElement.textContent = displayNumber(columnTotalNotCompletedStoryPoint)
                    } else {
                        // Generate a total badge to display at the top
                        let totalStoryPointElement = document.createElement('span')
                        totalStoryPointElement.className = 'columntop-notcompleted-story-point'
                        totalStoryPointElement.textContent = displayNumber(columnTotalNotCompletedStoryPoint)
                        Object.keys(badgeStyle).forEach(key => {
                            totalStoryPointElement.style[key] = badgeStyle[key]
                        })

                        // Add to the right end
                        listSectionHeader.appendChild(totalStoryPointElement)
                        // Added to the left of the title
                        //const t = listSectionHeader.querySelector('.SectionRow-sectionName')
                        //listSectionHeader.insertBefore(totalStoryPointElement, t)
                    }
                }
                // End StoryPoint (This is displayed only when there is 1 or more points)
                {
                    const hasTotalStoryPointElement = listSection.querySelector('.columntop-completed-story-point')
                    if(hasTotalStoryPointElement){
                        // If 0, do not display
                        if(columnTotalCompletedStoryPoint === 0){
                            hasTotalStoryPointElement.parentNode.removeChild(hasTotalStoryPointElement)
                            return
                        }

                        hasTotalStoryPointElement.textContent = displayNumber(columnTotalCompletedStoryPoint)
                    } else {
                        // If 0, do not display
                        if(columnTotalCompletedStoryPoint === 0){
                            return
                        }

                        // Generate a total badge to display at the top
                        let totalStoryPointElement = document.createElement('span')
                        totalStoryPointElement.className = 'columntop-completed-story-point'
                        totalStoryPointElement.textContent = displayNumber(columnTotalCompletedStoryPoint)
                        Object.keys(badgeStyle).forEach(key => {
                            totalStoryPointElement.style[key] = badgeStyle[key]
                        })
                        totalStoryPointElement.style.background = completedBadgeColor

                        listSectionHeader.appendChild(totalStoryPointElement)
                    }
                }
            })

            // Total on board (displayed on the right side of the project name at the top of the board)
            const boardTitleContainer = document.querySelector('.TopbarPageHeaderStructure-titleRow')
            if(!boardTitleContainer) return ;
            {
                const hasTotalStoryPointElement = document.querySelector('.boardtop-notcompleted-story-point')
                if(hasTotalStoryPointElement) {
                    hasTotalStoryPointElement.textContent = displayNumber(totalNotCompletedStoryPoint)
                } else {
                    // If 0, do not display
                    if(totalNotCompletedStoryPoint === 0) {
                        return
                    }
                    // Show total incomplete SP badge
                    let totalStoryPointElement = document.createElement('span')
                    totalStoryPointElement.className = 'boardtop-notcompleted-story-point'
                    totalStoryPointElement.textContent = displayNumber(totalNotCompletedStoryPoint)
                    Object.keys(badgeStyle).forEach(key => {
                        totalStoryPointElement.style[key] = badgeStyle[key]
                    })
                    boardTitleContainer.appendChild(totalStoryPointElement)
                }
            }
            // Show total completed SP badge
            {
                const hasTotalStoryPointElement = document.querySelector('.boardtop-completed-story-point')
                if(hasTotalStoryPointElement) {
                    // If 0, do not display
                    if(totalCompletedStoryPoint === 0){
                        hasTotalStoryPointElement.parentNode.removeChild(hasTotalStoryPointElement)
                        return
                    }

                    hasTotalStoryPointElement.textContent = displayNumber(totalCompletedStoryPoint)
                } else {
                    // If 0, do not display
                    if(totalCompletedStoryPoint === 0) {
                        return
                    }
                    let totalStoryPointElement = document.createElement('span')
                    totalStoryPointElement.className = 'boardtop-completed-story-point'
                    totalStoryPointElement.textContent = displayNumber(totalCompletedStoryPoint)
                    Object.keys(badgeStyle).forEach(key => {
                        totalStoryPointElement.style[key] = badgeStyle[key]
                    })
                    totalStoryPointElement.style.background = completedBadgeColor
                    boardTitleContainer.appendChild(totalStoryPointElement)
                }
            }

        })

}, 1000)

/**
 * Function that loops until the element can be obtained (max500ms)
 * @param {*} query
 * @param {*} wait ms
 */
function getElementUntilRendered(parent, query, wait) {
    return new Promise ((resolve, reject) => {
        function iter(counter) {
            if(counter*wait >= 500) {
                return reject()
            }
            const e = parent.querySelector(query)
            if(e) {
                return resolve(e)
            } else {
                return setTimeout(iter.bind(this, counter+1), wait)
            }
        }
        iter(0)
    })
}

/**
 * A function that loops until an element can be obtained (max500ms)
 * @param {*} query
 * @param {*} wait ms
 */
function getElementsUntilRendered(parent, query, wait) {
    return new Promise ((resolve, reject) => {
        function iter(counter) {
            if(counter*wait >= 500) {
                return reject()
            }
            const e = parent.querySelectorAll(query)
            if(e.length > 0) {
                return resolve(e)
            } else {
                return setTimeout(iter.bind(this, counter+1), wait)
            }
        }
        iter(0)
    })
}

function displayNumber(number) {
    return parseFloat(number.toFixed(2));
}
