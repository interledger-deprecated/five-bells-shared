'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const schema = require('./schema');
const shelljs = require('shelljs');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

const templatePath = path.join(__dirname, '/../templates/main.tpl.html');
const template = _.template(fs.readFileSync(templatePath, 'utf8'), {
  imports: { }
});

exports.compile = function (manifest) {
  manifest.fragmentsGrouped = _.groupBy(manifest.fragments, function (fragment) {
    return fragment.section;
  });
  manifest.fragments = manifest.fragments.map(function (fragment) {
    if (_.endsWith(fragment.src, '.md')) {
      fragment.content = md.render(fs.readFileSync(fragment.src, 'utf8'));
    } else if (_.endsWith(fragment.src, '.json')) {
      fragment.content = schema.render(fs.readFileSync(fragment.src, 'utf8'));
    } else {
      fragment.content = fs.readFileSync(fragment.src, 'utf8');
    }
    return fragment;
  });
  return template(manifest);
};

exports.copyAssets = function (destinationDir) {
  const sourceDir = path.join(__dirname, '../assets/docs/');
  shelljs.cp('-rf', sourceDir, destinationDir);
};
