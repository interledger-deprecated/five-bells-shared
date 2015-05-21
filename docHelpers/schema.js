'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '/../schemas');
const outDir = path.join(__dirname, '/../schemadoc-out');
const templatePath = path.join(__dirname, '/../templates/schemadoc.tpl.html');

function expandSchema(schema) {
  if (schema.allOf) {
    for (let subSchema of schema.allOf) {
      if (subSchema.$ref) {
        subSchema = require(path.join(baseDir, subSchema.$ref));
      }
      subSchema = expandSchema(subSchema);
      _.merge(schema, _.pick(subSchema, ['properties']));
    }
  }
  return schema;
}

function getTypeLink(type) {
  if (type.$ref) {
    const typeName = type.$ref.slice(0, type.$ref.length - 5);
    return '<a href="#' + typeName + '">' + typeName + '</a>';
  }

  return 'unknown';
}

const template = _.template(fs.readFileSync(templatePath, 'utf8'), {
  imports: {
    getTypeLink: getTypeLink
  }
});

exports.render = function renderSchema(schemaJson) {
  let output = '';
  try {
    const schema = expandSchema(JSON.parse(schemaJson));
    output = template(schema);
  } catch (e) {
    throw new Error('Failed to parse schema: ' + e.stack);
  }

  return output;
};
