// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Invalid bounding box that contains a negative area when recomputation is forced.
const invalidBoundingBox = () => [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
                                   Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];

// Computes the total area of the |boundingBox|.
const computeArea = boundingBox =>
    (boundingBox[2] - boundingBox[0]) * (boundingBox[3] - boundingBox[1]);

// Class representing a node on a GeoPlane, regardless of the strategies that are being used.
class Node {
  constructor(value, children, height) {
    this.area_ = value ? value.area() : 0;
    this.boundingBox_ = value ? value.boundingBox() : invalidBoundingBox();
    this.children_ = children || [];
    this.height_ = height || 1;
    this.value_ = value;

    if (!value && this.children_.length)
      this.recalculateBoundingBox();
  }

  // Gets the area of the bounding box surrounding this node.
  get area() { return this.area_; }

  // Gets the bounding box encapsulating this node and all its children.
  get boundingBox() { return this.boundingBox_; }

  // Gets the children of this node in the plane.
  get children() { return this.children_; }

  // Gets the height of the tree from this node downwards.
  get height() { return this.height_; }

  // Gets whether this node is a leaf in the tree (i.e. has no children).
  get isLeaf() { return !this.children_.length; }

  // Gets the value of this node, i.e. the object it's holding.
  get value() { return this.value_; }

  // Adds |node| as a child to this node. The bounding box of the node will be extended if needed.
  addChild(node) {
    this.extendBoundingBox(node);

    this.children_.push(node);
    return node;
  }

  // Sorts the children of this node using |compareFn|.
  sortChildren(compareFn) {
    this.children_.sort(compareFn);
  }

  // Splits this node at |index|, returning the removed child nodes and recalculating the new
  // bounding box that applies to the reduced set of children immediately.
  splitAt(index) {
    const children = this.children_.splice(index);

    this.recalculateBoundingBox();
    return children;
  }

  // Recalculates the bounding box of this node based on the bounding boxes of all the children
  // contained within this node. Has a time complexity of O(n).
  recalculateBoundingBox() {
    this.boundingBox_ = invalidBoundingBox();
    this.children.forEach(child =>
        this.extendBoundingBox(child, true /* deferAreaUpdate */));

    this.area_ = computeArea(this.boundingBox_);
  }

  // Extends the boundary box of this node with that of |node|.
  extendBoundingBox(node, deferAreaUpdate = false) {
    this.boundingBox_[0] = Math.min(this.boundingBox_[0], node.boundingBox[0]);
    this.boundingBox_[1] = Math.min(this.boundingBox_[1], node.boundingBox[1]);

    this.boundingBox_[2] = Math.max(this.boundingBox_[2], node.boundingBox[2]);
    this.boundingBox_[3] = Math.max(this.boundingBox_[3], node.boundingBox[3]);

    if (!deferAreaUpdate)
      this.area_ = computeArea(this.boundingBox_);
  }
};

exports = Node;
