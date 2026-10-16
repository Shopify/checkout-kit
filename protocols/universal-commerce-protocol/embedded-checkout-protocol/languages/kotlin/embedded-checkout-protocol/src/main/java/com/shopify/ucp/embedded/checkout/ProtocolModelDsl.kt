package com.shopify.ucp.embedded.checkout

/**
 * Scopes the builder DSL for outbound protocol models, so a nested block can't set a property
 * of an enclosing builder by accident.
 */
@DslMarker
@Target(AnnotationTarget.CLASS)
public annotation class ProtocolModelDsl
