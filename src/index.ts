import * as types from 'babel-types'
import readingTime from 'reading-time'
import {readFileCache} from 'proser/bin'
import type {ProserBabelPluginOptions} from 'proser/bin'

module.exports = function babelPluginReadingTime({
  types: t,
}: {
  types: typeof types
}) {
  return {
    name: '@proser/babel-plugin-reading-time',
    visitor: {
      ExportDeclaration(
        nodePath: any,
        state: {opts: ProserBabelPluginOptions}
      ) {
        const {posts} = state.opts
        const postContents = posts.reduce((acc, post) => {
          acc[post.slug] = readFileCache(post.filepath)
          return acc
        }, {} as Record<string, string>)
        const postsDeclarator = (
          nodePath.node.declaration.declarations || []
        ).find((declarator: any) => declarator.id.name === 'postsMap')
        if (!postsDeclarator) return

        const currentPosts = postsDeclarator.init.properties

        for (const i in currentPosts) {
          // Replace the current `component` property with the latest
          // one
          const properties = currentPosts[i].value.properties
          const slug = properties.find(
            (prop: any) => prop.key.name === 'slug' || prop.key.value === 'slug'
          ).value.value
          const metadataProperties = properties.find(
            (prop: any) =>
              prop.key.name === 'metadata' || prop.key.value === 'metadata'
          ).value.properties
          const {text, time, words} = readingTime(postContents[slug])
          const readingTimeExpression = t.objectExpression([
            t.objectProperty(t.identifier('text'), t.stringLiteral(text)),
            t.objectProperty(
              t.identifier('time'),
              t.numericLiteral(Math.round(time))
            ),
            t.objectProperty(t.identifier('words'), t.numericLiteral(words)),
          ])
          const readingTimeProperty = metadataProperties.find(
            (prop: any) =>
              prop.key.name === 'readingTime' ||
              prop.key.value === 'readingTime'
          )
          // Set reading time property
          if (readingTimeProperty) {
            readingTimeProperty.value = readingTimeExpression
          } else {
            metadataProperties.push(
              t.objectProperty(
                t.stringLiteral('readingTime'),
                readingTimeExpression
              )
            )
          }
        }
      },
    },
  }
}
